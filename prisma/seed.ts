import { PrismaClient, Role, EmployeeType, PeriodStatus, PhaseType, GoalType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Evaluation Period
  const period = await prisma.evaluationPeriod.create({
    data: {
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
  const deptSales = await prisma.organizationSnapshot.create({
    data: {
      name: '営業部',
      evaluationPeriodId: period.id,
    },
  });

  // 3. Employees
  const admin = await prisma.employee.create({
    data: {
      employeeCode: 'ADMIN001',
      name: 'システム管理者',
      email: 'admin@example.com',
    },
  });

  const hr = await prisma.employee.create({
    data: {
      employeeCode: 'HR001',
      name: '人事担当者',
      email: 'hr@example.com',
    },
  });

  const manager = await prisma.employee.create({
    data: {
      employeeCode: 'MGR001',
      name: '営業部長',
      email: 'manager@example.com',
    },
  });

  const member = await prisma.employee.create({
    data: {
      employeeCode: 'MEM001',
      name: '一般社員',
      email: 'member@example.com',
    },
  });

  // 4. Memberships
  await prisma.organizationMembership.create({
    data: {
      employeeId: admin.id,
      organizationSnapshotId: deptSales.id,
      grade: 6,
      gradeType: 'ADMIN',
      position: 'システム管理者',
      employeeType: EmployeeType.REGULAR,
      roles: [Role.ADMIN],
      joinDate: new Date('2020-04-01'),
      validFrom: new Date('2025-10-01'),
    },
  });

  await prisma.organizationMembership.create({
    data: {
      employeeId: manager.id,
      organizationSnapshotId: deptSales.id,
      grade: 5,
      gradeType: 'MANAGER',
      position: '部長',
      employeeType: EmployeeType.REGULAR,
      roles: [Role.MANAGER],
      joinDate: new Date('2015-04-01'),
      validFrom: new Date('2025-10-01'),
    },
  });

  const memberMembership = await prisma.organizationMembership.create({
    data: {
      employeeId: member.id,
      organizationSnapshotId: deptSales.id,
      grade: 3,
      gradeType: 'MEMBER',
      position: 'スタッフ',
      employeeType: EmployeeType.REGULAR,
      roles: [Role.MEMBER],
      managerId: manager.id,
      joinDate: new Date('2023-04-01'),
      validFrom: new Date('2025-10-01'),
    },
  });

  // 5. Initial GoalSet for member
  await prisma.goalSet.create({
    data: {
      employeeId: member.id,
      evaluationPeriodId: period.id,
      membershipId: memberMembership.id,
      goals: {
        create: [
          {
            goalType: GoalType.KPI_1,
            title: '売上1000万達成',
            description: '新規開拓中心に売上目標を達成する',
            kpiPattern: 'KPI_DECOMPOSITION',
            criteria10: '売上1000万円',
            weight: 50,
          },
          {
            goalType: GoalType.KPI_2,
            title: '新規顧客30社獲得',
            description: '展示会リードからのアプローチを強化',
            kpiPattern: 'LEADING_INDICATOR',
            criteria10: '新規受注30社',
            weight: 30,
          },
          {
            goalType: GoalType.ORG_CONTRIBUTION,
            title: '採用オンボーディング改善',
            description: '新入社員向けの資料整備とメンター実施',
            kpiPattern: 'UPPER_GOAL',
            criteria10: 'オンボーディング資料の完成',
            weight: 20,
          },
        ],
      },
    },
  });

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
