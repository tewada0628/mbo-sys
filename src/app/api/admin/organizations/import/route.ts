import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';

type ImportRow = {
  lineNumber: number;
  name: string;
  parentName: string | null;
};

const requiredHeaders = ['name', 'parent_name'];

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

function parseOrganizationCsv(csvText: string) {
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

  const nameIndex = headers.indexOf('name');
  const parentNameIndex = headers.indexOf('parent_name');

  return lines.slice(1).map((line, index): ImportRow => {
    const values = parseCsvLine(line);
    const name = values[nameIndex]?.trim() ?? '';
    const parentName = values[parentNameIndex]?.trim() || null;
    const lineNumber = index + 2;

    if (!name) {
      throw new Error(`${lineNumber}行目: name は必須です。`);
    }

    if (name === parentName) {
      throw new Error(`${lineNumber}行目: parent_name に自分自身は指定できません。`);
    }

    return { lineNumber, name, parentName };
  });
}

function validateRows(rows: ImportRow[]) {
  const seenNames = new Set<string>();
  for (const row of rows) {
    if (seenNames.has(row.name)) {
      throw new Error(`${row.lineNumber}行目: name がCSV内で重複しています。組織名は評価期内で一意にしてください。`);
    }
    seenNames.add(row.name);
  }

  const rowNames = new Set(rows.map((row) => row.name));
  for (const row of rows) {
    if (row.parentName && !rowNames.has(row.parentName)) {
      continue;
    }

    const visited = new Set<string>();
    let current: ImportRow | undefined = row;
    while (current?.parentName) {
      if (visited.has(current.parentName)) {
        throw new Error(`${row.lineNumber}行目: 親子関係が循環しています。`);
      }
      visited.add(current.name);
      current = rows.find((candidate) => candidate.name === current?.parentName);
    }
  }
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
    });

    if (!period) {
      return NextResponse.json({ error: 'Evaluation period not found' }, { status: 404 });
    }

    const rows = parseOrganizationCsv(csvText);
    validateRows(rows);

    const existingOrganizations = await prisma.organizationSnapshot.findMany({
      where: { evaluationPeriodId },
      orderBy: { createdAt: 'asc' },
    });

    const duplicatedExistingName = existingOrganizations.find((organization, index) => (
      existingOrganizations.findIndex((candidate) => candidate.name === organization.name) !== index
    ));
    if (duplicatedExistingName) {
      return NextResponse.json(
        { error: `既存組織名 ${duplicatedExistingName.name} が重複しているためCSV取込できません。先に組織名を整理してください。` },
        { status: 409 },
      );
    }

    const existingByName = new Map(existingOrganizations.map((organization) => [organization.name, organization]));
    const importedNames = new Set(rows.map((row) => row.name));
    const missingParents = rows.filter((row) => (
      row.parentName && !importedNames.has(row.parentName) && !existingByName.has(row.parentName)
    ));

    if (missingParents.length > 0) {
      const first = missingParents[0];
      return NextResponse.json(
        { error: `${first.lineNumber}行目: parent_name「${first.parentName}」が同じ評価期の既存組織またはCSV内にありません。` },
        { status: 400 },
      );
    }

    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      const organizationIdsByName = new Map(existingOrganizations.map((organization) => [organization.name, organization.id]));

      for (const row of rows) {
        const existing = existingByName.get(row.name);

        if (existing) {
          organizationIdsByName.set(row.name, existing.id);
          continue;
        }

        const organization = await tx.organizationSnapshot.create({
          data: {
            evaluationPeriodId,
            name: row.name,
          },
        });
        organizationIdsByName.set(row.name, organization.id);
        createdCount += 1;
      }

      for (const row of rows) {
        const organizationId = organizationIdsByName.get(row.name);
        const parentId = row.parentName ? organizationIdsByName.get(row.parentName) ?? null : null;
        if (!organizationId) continue;

        await tx.organizationSnapshot.update({
          where: { id: organizationId },
          data: { parentId },
        });

        if (existingByName.has(row.name)) {
          updatedCount += 1;
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
    console.error('Error importing organizations:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
