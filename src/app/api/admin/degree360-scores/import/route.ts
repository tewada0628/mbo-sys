import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { EVALUATION_PHASES, getCurrentPhase, isInPhase } from '@/lib/phases';

type ImportRow = {
  lineNumber: number;
  employeeCode: string;
  achievementScore: number;
  credoScore: number;
  isTop20Achievement: boolean;
  source: string;
};

const requiredHeaders = ['employee_code', 'achievement_score', 'credo_score', 'is_top20_achievement'];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseBoolean(value: string | undefined) {
  const normalized = (value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', '対象', '上位20%', '上位20'].includes(normalized);
}

function parseScore(value: string | undefined, fieldName: string, max: number, lineNumber: number) {
  const score = Number((value ?? '').trim());
  if (!Number.isFinite(score) || score < 0 || score > max) {
    throw new Error(`${lineNumber}行目: ${fieldName} は0〜${max}の数値で入力してください。`);
  }
  return score;
}

function parseRows(csvText: string, selectedPeriodName: string) {
  const normalizedText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSVにはヘッダー行と1件以上のデータ行が必要です。');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const missingHeader = requiredHeaders.find((header) => !headers.includes(header));
  if (missingHeader) {
    throw new Error(`CSVヘッダーに ${missingHeader} 列が必要です。`);
  }

  const indexOf = (header: string) => headers.indexOf(header);
  const rows = lines.slice(1).map((line, index): ImportRow => {
    const values = parseCsvLine(line);
    const lineNumber = index + 2;
    const get = (header: string) => values[indexOf(header)]?.trim() ?? '';
    const evaluationPeriodName = headers.includes('evaluation_period_name') ? get('evaluation_period_name') : '';
    const employeeCode = get('employee_code');

    if (!employeeCode) throw new Error(`${lineNumber}行目: employee_code は必須です。`);
    if (evaluationPeriodName && evaluationPeriodName !== selectedPeriodName) {
      throw new Error(`${lineNumber}行目: evaluation_period_name は選択中の評価期「${selectedPeriodName}」と一致させてください。`);
    }

    return {
      lineNumber,
      employeeCode,
      achievementScore: parseScore(get('achievement_score'), 'achievement_score', 5, lineNumber),
      credoScore: parseScore(get('credo_score'), 'credo_score', 7, lineNumber),
      isTop20Achievement: parseBoolean(get('is_top20_achievement')),
      source: get('source') || 'HR_INPUT',
    };
  });

  const seenEmployeeCodes = new Set<string>();
  for (const row of rows) {
    if (seenEmployeeCodes.has(row.employeeCode)) {
      throw new Error(`${row.lineNumber}行目: employee_code がCSV内で重複しています。`);
    }
    seenEmployeeCodes.add(row.employeeCode);
  }

  return rows;
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const body = await req.json();
    const evaluationPeriodId = typeof body.evaluationPeriodId === 'string' ? body.evaluationPeriodId : '';
    const csvText = typeof body.csvText === 'string' ? body.csvText : '';

    if (!evaluationPeriodId) {
      return NextResponse.json({ error: '評価期を選択してください。' }, { status: 400 });
    }
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'CSVファイルを選択してください。' }, { status: 400 });
    }

    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: evaluationPeriodId },
      select: { id: true, name: true },
    });
    if (!period) {
      return NextResponse.json({ error: 'Evaluation period not found' }, { status: 404 });
    }

    const currentPhase = await getCurrentPhase(evaluationPeriodId);
    if (!isInPhase(currentPhase?.phaseType, [EVALUATION_PHASES.DEGREE_360, EVALUATION_PHASES.ADJUSTMENT])) {
      return NextResponse.json({ error: '360度評価または評価調整・確定フェーズ外のため取込できません。' }, { status: 403 });
    }

    const rows = parseRows(csvText, period.name);
    const employees = await prisma.employee.findMany({
      where: { employeeCode: { in: rows.map((row) => row.employeeCode) } },
      select: { id: true, employeeCode: true },
    });
    const employeeByCode = new Map(employees.map((employee) => [employee.employeeCode, employee]));

    for (const row of rows) {
      if (!employeeByCode.has(row.employeeCode)) {
        return NextResponse.json(
          { error: `${row.lineNumber}行目: 社員番号「${row.employeeCode}」が見つかりません。` },
          { status: 400 },
        );
      }
    }

    const existingScores = await prisma.degree360Score.findMany({
      where: {
        evaluationPeriodId,
        employeeId: { in: employees.map((employee) => employee.id) },
      },
      select: { id: true, employeeId: true },
    });
    const existingScoreByEmployeeId = new Map(existingScores.map((score) => [score.employeeId, score]));

    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const employee = employeeByCode.get(row.employeeCode);
        if (!employee) continue;

        const scoreData = {
          achievementScore: row.achievementScore,
          credoScore: row.credoScore,
          isTop20Achievement: row.isTop20Achievement,
          source: row.source,
          importedAt: new Date(),
        };
        const existingScore = existingScoreByEmployeeId.get(employee.id);

        if (existingScore) {
          await tx.degree360Score.update({
            where: { id: existingScore.id },
            data: scoreData,
          });
          updatedCount += 1;
        } else {
          await tx.degree360Score.create({
            data: {
              employeeId: employee.id,
              evaluationPeriodId,
              ...scoreData,
            },
          });
          createdCount += 1;
        }
      }
    });

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      totalCount: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Error importing degree360 scores:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
