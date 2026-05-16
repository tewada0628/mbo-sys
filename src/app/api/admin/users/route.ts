import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { employeeCreateSchema } from '@/lib/validations/admin';

export async function GET() {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const [employees, organizations, periods] = await Promise.all([
      prisma.employee.findMany({
        include: {
          memberships: {
            orderBy: { validFrom: 'desc' },
            include: {
              organizationSnapshot: {
                include: {
                  evaluationPeriod: true,
                },
              },
              manager: true,
              divisionManager: true,
              executive: true,
            },
          },
        },
        orderBy: { employeeCode: 'asc' },
      }),
      prisma.organizationSnapshot.findMany({
        include: {
          evaluationPeriod: true,
        },
        orderBy: [
          { evaluationPeriod: { startDate: 'desc' } },
          { name: 'asc' },
        ],
      }),
      prisma.evaluationPeriod.findMany({
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      }),
    ]);

    const items = employees.map((employee) => {
      const membership = employee.memberships.find((item) => item.validTo === null) ?? employee.memberships[0] ?? null;
      return {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        isActive: employee.isActive,
        memberships: employee.memberships.map((item) => ({
          id: item.id,
          organizationSnapshotId: item.organizationSnapshotId,
          organizationName: item.organizationSnapshot.name,
          evaluationPeriodId: item.organizationSnapshot.evaluationPeriodId,
          evaluationPeriodName: item.organizationSnapshot.evaluationPeriod.name,
          grade: item.grade,
          gradeType: item.gradeType,
          position: item.position,
          employeeType: item.employeeType,
          roles: item.roles,
          managerId: item.managerId,
          managerName: item.manager?.name ?? null,
          divisionManagerId: item.divisionManagerId,
          divisionManagerName: item.divisionManager?.name ?? null,
          executiveId: item.executiveId,
          executiveName: item.executive?.name ?? null,
          validFrom: item.validFrom.toISOString().slice(0, 10),
          validTo: item.validTo?.toISOString().slice(0, 10) ?? null,
        })),
        membership: membership ? {
          id: membership.id,
          organizationSnapshotId: membership.organizationSnapshotId,
          organizationName: membership.organizationSnapshot.name,
          evaluationPeriodId: membership.organizationSnapshot.evaluationPeriodId,
          evaluationPeriodName: membership.organizationSnapshot.evaluationPeriod.name,
          grade: membership.grade,
          gradeType: membership.gradeType,
          position: membership.position,
          employeeType: membership.employeeType,
          roles: membership.roles,
          managerId: membership.managerId,
          managerName: membership.manager?.name ?? null,
          divisionManagerId: membership.divisionManagerId,
          divisionManagerName: membership.divisionManager?.name ?? null,
          executiveId: membership.executiveId,
          executiveName: membership.executive?.name ?? null,
          validFrom: membership.validFrom.toISOString().slice(0, 10),
          validTo: membership.validTo?.toISOString().slice(0, 10) ?? null,
        } : null,
      };
    });

    return NextResponse.json({
      periods: periods.map((period) => ({
        id: period.id,
        name: period.name,
        status: period.status,
        startDate: period.startDate.toISOString().slice(0, 10),
        endDate: period.endDate.toISOString().slice(0, 10),
      })),
      items,
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        evaluationPeriodId: organization.evaluationPeriodId,
        evaluationPeriodName: organization.evaluationPeriod.name,
        evaluationPeriodStatus: organization.evaluationPeriod.status,
      })),
      employees: employees.map((employee) => ({
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        isActive: employee.isActive,
      })),
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const body = await req.json();
    const result = employeeCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const { membership, ...employeeInput } = result.data;

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { employeeCode: employeeInput.employeeCode },
          { email: employeeInput.email },
        ],
      },
    });

    if (existingEmployee) {
      return NextResponse.json({ error: '社員番号またはメールアドレスが既に登録されています。' }, { status: 409 });
    }

    const employee = await prisma.employee.create({
      data: {
        ...employeeInput,
        memberships: {
          create: {
            organizationSnapshotId: membership.organizationSnapshotId,
            grade: membership.grade,
            gradeType: membership.gradeType,
            position: membership.position,
            employeeType: membership.employeeType,
            roles: membership.roles,
            managerId: membership.managerId,
            divisionManagerId: membership.divisionManagerId,
            executiveId: membership.executiveId,
            joinDate: membership.validFrom,
            validFrom: membership.validFrom,
            validTo: membership.validTo ?? null,
          },
        },
      },
    });

    return NextResponse.json({ success: true, id: employee.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
