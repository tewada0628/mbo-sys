import { NextResponse } from 'next/server';
import type { EmployeeType, Role } from '@prisma/client';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';

type ImportRow = {
  lineNumber: number;
  employeeCode: string;
  name: string;
  email: string;
  isActive: boolean;
  organizationName: string;
  grade: number;
  gradeType: string;
  position: string;
  employeeType: EmployeeType;
  roles: Role[];
  managerEmployeeCode: string | null;
  divisionManagerEmployeeCode: string | null;
  executiveEmployeeCode: string | null;
  validFrom: Date;
  validTo: Date | null;
};

const requiredHeaders = [
  'employee_code',
  'name',
  'email',
  'organization_name',
  'grade',
  'grade_type',
  'position',
  'employee_type',
  'roles',
  'valid_from',
];

const roleValues = new Set<Role>(['ADMIN', 'HR', 'MANAGER', 'TEAM_LEADER', 'MEMBER']);
const employeeTypeValues = new Set<EmployeeType>(['REGULAR', 'CONTRACT', 'ASSISTANT']);

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
  if (!normalized) return true;
  return ['true', '1', 'yes', 'y', '有効'].includes(normalized);
}

function parseDate(value: string | undefined, fieldName: string, lineNumber: number) {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    throw new Error(`${lineNumber}行目: ${fieldName} は必須です。`);
  }
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${lineNumber}行目: ${fieldName} は YYYY-MM-DD 形式で入力してください。`);
  }
  return date;
}

function parseOptionalDate(value: string | undefined, fieldName: string, lineNumber: number) {
  const normalized = (value ?? '').trim();
  if (!normalized) return null;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${lineNumber}行目: ${fieldName} は YYYY-MM-DD 形式で入力してください。`);
  }
  return date;
}

function parseRoles(value: string | undefined, lineNumber: number) {
  const roles = (value ?? '')
    .split(/[;|]/)
    .map((role) => role.trim())
    .filter(Boolean);

  if (roles.length === 0) {
    throw new Error(`${lineNumber}行目: roles は必須です。`);
  }

  const invalidRole = roles.find((role) => !roleValues.has(role as Role));
  if (invalidRole) {
    throw new Error(`${lineNumber}行目: roles に不正な値があります: ${invalidRole}`);
  }

  return Array.from(new Set(roles)) as Role[];
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
    const name = get('name');
    const email = get('email');
    const employeeType = get('employee_type') as EmployeeType;
    const grade = Number(get('grade'));
    const managerEmployeeCode = get('manager_employee_code') || null;
    const divisionManagerEmployeeCode = get('division_manager_employee_code') || null;
    const executiveEmployeeCode = get('executive_employee_code') || null;

    if (!employeeCode) throw new Error(`${lineNumber}行目: employee_code は必須です。`);
    if (!name) throw new Error(`${lineNumber}行目: name は必須です。`);
    if (!email || !email.includes('@')) throw new Error(`${lineNumber}行目: email が不正です。`);
    if (!Number.isInteger(grade) || grade < 1 || grade > 9) {
      throw new Error(`${lineNumber}行目: grade は1〜9の整数で入力してください。`);
    }
    if (!employeeTypeValues.has(employeeType)) {
      throw new Error(`${lineNumber}行目: employee_type に不正な値があります: ${employeeType}`);
    }
    if ([managerEmployeeCode, divisionManagerEmployeeCode, executiveEmployeeCode].includes(employeeCode)) {
      throw new Error(`${lineNumber}行目: 評価者に自分自身は指定できません。`);
    }
    if (evaluationPeriodName && evaluationPeriodName !== selectedPeriodName) {
      throw new Error(`${lineNumber}行目: evaluation_period_name は選択中の評価期「${selectedPeriodName}」と一致させてください。`);
    }

    return {
      lineNumber,
      employeeCode,
      name,
      email,
      isActive: parseBoolean(get('is_active')),
      organizationName: get('organization_name'),
      grade,
      gradeType: get('grade_type'),
      position: get('position'),
      employeeType,
      roles: parseRoles(get('roles'), lineNumber),
      managerEmployeeCode,
      divisionManagerEmployeeCode,
      executiveEmployeeCode,
      validFrom: parseDate(get('valid_from'), 'valid_from', lineNumber),
      validTo: parseOptionalDate(get('valid_to'), 'valid_to', lineNumber),
    };
  });

  const seenEmployeeCodes = new Set<string>();
  const seenEmails = new Set<string>();
  for (const row of rows) {
    if (seenEmployeeCodes.has(row.employeeCode)) {
      throw new Error(`${row.lineNumber}行目: employee_code がCSV内で重複しています。`);
    }
    if (seenEmails.has(row.email)) {
      throw new Error(`${row.lineNumber}行目: email がCSV内で重複しています。`);
    }
    if (!row.organizationName) throw new Error(`${row.lineNumber}行目: organization_name は必須です。`);
    if (!row.gradeType) throw new Error(`${row.lineNumber}行目: grade_type は必須です。`);
    if (!row.position) throw new Error(`${row.lineNumber}行目: position は必須です。`);
    if (row.validTo && row.validTo < row.validFrom) {
      throw new Error(`${row.lineNumber}行目: valid_to は valid_from 以降の日付にしてください。`);
    }
    seenEmployeeCodes.add(row.employeeCode);
    seenEmails.add(row.email);
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
    });

    if (!period) {
      return NextResponse.json({ error: 'Evaluation period not found' }, { status: 404 });
    }

    const rows = parseRows(csvText, period.name);
    const allEmployeeCodes = Array.from(new Set([
      ...rows.map((row) => row.employeeCode),
      ...rows.flatMap((row) => [
        row.managerEmployeeCode,
        row.divisionManagerEmployeeCode,
        row.executiveEmployeeCode,
      ].filter(Boolean) as string[]),
    ]));

    const [existingEmployees, existingOrganizations] = await Promise.all([
      prisma.employee.findMany({
        where: {
          OR: [
            { employeeCode: { in: allEmployeeCodes } },
            { email: { in: rows.map((row) => row.email) } },
          ],
        },
        include: {
          memberships: {
            orderBy: { validFrom: 'desc' },
            include: {
              organizationSnapshot: {
                select: { evaluationPeriodId: true },
              },
            },
          },
        },
      }),
      prisma.organizationSnapshot.findMany({
        where: { evaluationPeriodId },
        include: { evaluationPeriod: true },
      }),
    ]);

    const employeeByCode = new Map(existingEmployees.map((employee) => [employee.employeeCode, employee]));
    const employeeByEmail = new Map(existingEmployees.map((employee) => [employee.email, employee]));

    for (const row of rows) {
      const employeeBySameEmail = employeeByEmail.get(row.email);
      if (employeeBySameEmail && employeeBySameEmail.employeeCode !== row.employeeCode) {
        return NextResponse.json(
          { error: `${row.lineNumber}行目: email は別の社員番号で既に登録されています。` },
          { status: 409 },
        );
      }
    }

    const organizationsByKey = new Map<string, typeof existingOrganizations[number]>();
    for (const organization of existingOrganizations) {
      if (organizationsByKey.has(organization.name)) {
        return NextResponse.json(
          { error: `評価期「${period.name}」内で組織名「${organization.name}」が重複しているためCSV取込できません。` },
          { status: 409 },
        );
      }
      organizationsByKey.set(organization.name, organization);
    }

    for (const row of rows) {
      const organization = organizationsByKey.get(row.organizationName);
      if (!organization) {
        return NextResponse.json(
          { error: `${row.lineNumber}行目: 評価期「${period.name}」の組織「${row.organizationName}」が見つかりません。先に組織管理で登録してください。` },
          { status: 400 },
        );
      }
      for (const code of [row.managerEmployeeCode, row.divisionManagerEmployeeCode, row.executiveEmployeeCode]) {
        if (code && !employeeByCode.has(code) && !rows.some((candidate) => candidate.employeeCode === code)) {
          return NextResponse.json(
            { error: `${row.lineNumber}行目: 評価者の社員番号「${code}」が見つかりません。` },
            { status: 400 },
          );
        }
      }
    }

    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      const mutableEmployeeByCode = new Map(employeeByCode);

      for (const row of rows) {
        const existing = mutableEmployeeByCode.get(row.employeeCode);
        const employee = existing
          ? await tx.employee.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                email: row.email,
                isActive: row.isActive,
              },
              include: {
                memberships: {
                  orderBy: { validFrom: 'desc' },
                  include: {
                    organizationSnapshot: {
                      select: { evaluationPeriodId: true },
                    },
                  },
                },
              },
            })
          : await tx.employee.create({
              data: {
                employeeCode: row.employeeCode,
                name: row.name,
                email: row.email,
                isActive: row.isActive,
              },
              include: {
                memberships: {
                  orderBy: { validFrom: 'desc' },
                  include: {
                    organizationSnapshot: {
                      select: { evaluationPeriodId: true },
                    },
                  },
                },
              },
            });

        mutableEmployeeByCode.set(row.employeeCode, employee);
        if (existing) updatedCount += 1;
        else createdCount += 1;
      }

      for (const row of rows) {
        const employee = mutableEmployeeByCode.get(row.employeeCode);
        const organization = organizationsByKey.get(row.organizationName);
        if (!employee || !organization) continue;

        const manager = row.managerEmployeeCode ? mutableEmployeeByCode.get(row.managerEmployeeCode) : null;
        const divisionManager = row.divisionManagerEmployeeCode ? mutableEmployeeByCode.get(row.divisionManagerEmployeeCode) : null;
        const executive = row.executiveEmployeeCode ? mutableEmployeeByCode.get(row.executiveEmployeeCode) : null;
        const membership = employee.memberships.find((item) => (
          item.organizationSnapshot.evaluationPeriodId === evaluationPeriodId
        )) ?? null;

        const membershipData = {
          organizationSnapshotId: organization.id,
          grade: row.grade,
          gradeType: row.gradeType,
          position: row.position,
          employeeType: row.employeeType,
          roles: row.roles,
          managerId: manager?.id ?? null,
          divisionManagerId: divisionManager?.id ?? null,
          executiveId: executive?.id ?? null,
          validFrom: row.validFrom,
          validTo: row.validTo,
        };

        if (membership) {
          await tx.organizationMembership.update({
            where: { id: membership.id },
            data: membershipData,
          });
        } else {
          await tx.organizationMembership.create({
            data: {
              employeeId: employee.id,
              joinDate: row.validFrom,
              ...membershipData,
            },
          });
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
    console.error('Error importing users:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
