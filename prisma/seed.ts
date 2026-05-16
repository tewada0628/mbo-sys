import 'dotenv/config';
import { PrismaClient, Role, EmployeeType, PeriodStatus, PhaseType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Evaluation Period
  const periodId = '00000000-0000-0000-0000-000000000001';
  const period = await prisma.evaluationPeriod.upsert({
    where: { id: periodId },
    update: {},
    create: {
      id: periodId,
      name: '2025年度',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-09-30'),
      status: PeriodStatus.ACTIVE,
      phases: {
        create: [
          { phaseType: PhaseType.GOAL_SETTING, startDate: new Date('2025-10-01'), endDate: new Date('2025-12-31') },
          { phaseType: PhaseType.MIDTERM, startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28') },
          { phaseType: PhaseType.DEGREE_360, startDate: new Date('2026-07-01'), endDate: new Date('2026-07-31') },
          { phaseType: PhaseType.SELF_REVIEW, startDate: new Date('2026-08-01'), endDate: new Date('2026-09-15') },
          { phaseType: PhaseType.MANAGER_REVIEW, startDate: new Date('2026-08-15'), endDate: new Date('2026-09-30') },
          { phaseType: PhaseType.ADJUSTMENT, startDate: new Date('2026-10-01'), endDate: new Date('2026-10-31') },
        ],
      },
    },
  });

  // 2. Organization Snapshot
  const deptSalesId = '00000000-0000-0000-0000-000000000002';
  const deptSales = await prisma.organizationSnapshot.upsert({
    where: { id: deptSalesId },
    update: {},
    create: {
      id: deptSalesId,
      name: '営業部',
      evaluationPeriodId: period.id,
    },
  });

  // 3. Employees
  const employees = [
    { code: '00001', name: '和田', email: 't-wada@new-one.co.jp', role: Role.ADMIN },
    { code: '10001', name: 'システム管理者', email: 'admin@example.com', role: Role.ADMIN },
    { code: '20001', name: '人事担当者', email: 't-wada+hr@new-one.co.jp', role: Role.HR },
    { code: '30001', name: '営業部長', email: 't-wada+manager@new-one.co.jp', role: Role.MANAGER },
    { code: '40001', name: '一般社員', email: 't-wada+member@new-one.co.jp', role: Role.MEMBER },
    { code: '50001', name: '契約社員(MBO対象外)', email: 't-wada+contract@new-one.co.jp', role: Role.MEMBER, type: EmployeeType.CONTRACT, grade: 2 },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { employeeCode: emp.code },
      update: { name: emp.name, email: emp.email },
      create: {
        employeeCode: emp.code,
        name: emp.name,
        email: emp.email,
      },
    });
  }

  // Fetch created employees to use their IDs for relationships
  const dbEmployees = await prisma.employee.findMany();
  const getEmpId = (code: string) => dbEmployees.find(e => e.employeeCode === code)?.id;

  const managerId = getEmpId('30001'); // 営業部長
  const divisionManagerId = getEmpId('30001'); // 兼任
  const executiveId = getEmpId('20001'); // 人事担当者

  for (const emp of employees) {
    const createdEmp = dbEmployees.find(e => e.employeeCode === emp.code)!;

    // Membership (Using numeric codes to ensure valid UUID format)
    const membershipId = `00000000-0000-0000-0000-${emp.code.padStart(12, '0')}`;
    await prisma.organizationMembership.upsert({
      where: { id: membershipId },
      update: { roles: [emp.role] },
      create: {
        id: membershipId,
        employeeId: createdEmp.id,
        organizationSnapshotId: deptSales.id,
        grade: emp.grade || (emp.role === Role.ADMIN ? 6 : 3),
        gradeType: 'STANDARD',
        position: emp.role === Role.ADMIN ? '管理者' : 'スタッフ',
        employeeType: emp.type || EmployeeType.REGULAR,
        roles: [emp.role],
        managerId: emp.role === Role.MEMBER ? managerId : null,
        divisionManagerId: emp.role === Role.MEMBER ? divisionManagerId : null,
        executiveId: emp.role === Role.MEMBER ? executiveId : null,
        joinDate: new Date('2020-04-01'),
        validFrom: new Date('2025-10-01'),
      },
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
