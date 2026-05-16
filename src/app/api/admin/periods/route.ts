import { NextResponse } from 'next/server';
import type { PhaseType } from '@prisma/client';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { periodSchema } from '@/lib/validations/admin';

const phaseTypes: PhaseType[] = [
  'GOAL_SETTING',
  'MIDTERM',
  'DEGREE_360',
  'SELF_REVIEW',
  'MANAGER_REVIEW',
  'ADJUSTMENT',
];

function buildDefaultPhases(startDate: Date, endDate: Date) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const interval = Math.max(1, Math.floor((end - start) / phaseTypes.length));

  return phaseTypes.map((phaseType, index) => {
    const phaseStart = new Date(start + interval * index);
    const phaseEnd = index === phaseTypes.length - 1
      ? new Date(end)
      : new Date(start + interval * (index + 1) - 24 * 60 * 60 * 1000);

    return {
      phaseType,
      startDate: phaseStart,
      endDate: phaseEnd < phaseStart ? phaseStart : phaseEnd,
    };
  });
}

export async function GET() {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const periods = await prisma.evaluationPeriod.findMany({
      include: {
        phases: {
          orderBy: { startDate: 'asc' },
        },
        organizationSnapshots: {
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        },
        _count: {
          select: {
            organizationSnapshots: true,
            goalSets: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({
      items: periods.map((period) => ({
        id: period.id,
        name: period.name,
        startDate: period.startDate.toISOString().slice(0, 10),
        endDate: period.endDate.toISOString().slice(0, 10),
        status: period.status,
        organizationCount: period._count.organizationSnapshots,
        membershipCount: period.organizationSnapshots.reduce((sum, organization) => (
          sum + organization._count.memberships
        ), 0),
        goalSetCount: period._count.goalSets,
        phases: period.phases.map((phase) => ({
          id: phase.id,
          phaseType: phase.phaseType,
          startDate: phase.startDate.toISOString().slice(0, 10),
          endDate: phase.endDate.toISOString().slice(0, 10),
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const body = await req.json();
    const result = periodSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const period = await prisma.evaluationPeriod.create({
      data: {
        name: result.data.name,
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        status: result.data.status,
        phases: {
          create: buildDefaultPhases(result.data.startDate, result.data.endDate),
        },
      },
    });

    return NextResponse.json({ success: true, id: period.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating period:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
