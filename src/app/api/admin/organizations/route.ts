import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { organizationSchema } from '@/lib/validations/admin';

export async function GET() {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const [periods, organizations] = await Promise.all([
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
      prisma.organizationSnapshot.findMany({
        include: {
          evaluationPeriod: true,
          parent: true,
          _count: {
            select: {
              memberships: true,
              children: true,
            },
          },
        },
        orderBy: [
          { evaluationPeriod: { startDate: 'desc' } },
          { name: 'asc' },
        ],
      }),
    ]);

    return NextResponse.json({
      periods: periods.map((period) => ({
        id: period.id,
        name: period.name,
        status: period.status,
        startDate: period.startDate.toISOString().slice(0, 10),
        endDate: period.endDate.toISOString().slice(0, 10),
      })),
      organizations: organizations.map((organization) => ({
        id: organization.id,
        evaluationPeriodId: organization.evaluationPeriodId,
        evaluationPeriodName: organization.evaluationPeriod.name,
        name: organization.name,
        parentId: organization.parentId,
        parentName: organization.parent?.name ?? null,
        membershipCount: organization._count.memberships,
        childCount: organization._count.children,
      })),
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const body = await req.json();
    const result = organizationSchema.required({ evaluationPeriodId: true }).safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const organization = await prisma.organizationSnapshot.create({
      data: {
        evaluationPeriodId: result.data.evaluationPeriodId,
        name: result.data.name,
        parentId: result.data.parentId ?? null,
      },
    });

    return NextResponse.json({ success: true, id: organization.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
