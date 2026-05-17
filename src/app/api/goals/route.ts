import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { goalSetSchema } from '@/lib/validations/goal';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const evaluationPeriodId = typeof body.evaluationPeriodId === 'string' ? body.evaluationPeriodId : '';

    if (!evaluationPeriodId) {
      return NextResponse.json({ error: 'Evaluation period is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: user.email },
      include: {
        memberships: {
          where: {
            organizationSnapshot: {
              evaluationPeriodId,
            },
          },
          orderBy: {
            validFrom: 'desc',
          },
          include: {
            organizationSnapshot: {
              include: { evaluationPeriod: true }
            }
          }
        }
      }
    });

    if (!employee || employee.memberships.length === 0) {
      return NextResponse.json({ error: 'No membership found for selected evaluation period' }, { status: 400 });
    }

    const result = goalSetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const membership = employee.memberships.find((item) => item.validTo === null) ?? employee.memberships[0];
    const isMboExempt = membership.employeeType !== 'REGULAR' || membership.grade <= 2;
    const initialStatus = isMboExempt ? 'SAVED' : 'DRAFT';

    const existingGoalSet = await prisma.goalSet.findFirst({
      where: {
        employeeId: employee.id,
        evaluationPeriodId,
        isActive: true,
      },
      select: { id: true },
    });

    if (existingGoalSet) {
      return NextResponse.json(
        { error: 'Goal set already exists for selected evaluation period', id: existingGoalSet.id },
        { status: 409 },
      );
    }

    const goalSet = await prisma.goalSet.create({
      data: {
        employeeId: employee.id,
        evaluationPeriodId,
        membershipId: membership.id,
        status: initialStatus,
        isMboTarget: !isMboExempt,
        isEvaluationExempt: isMboExempt,
        goals: {
          create: result.data.goals.map(g => ({
            title: g.title,
            description: g.description,
            goalType: g.goalType,
            kpiPattern: g.kpiPattern,
            criteria12: g.criteria12,
            criteria10: g.criteria10,
            criteria08: g.criteria08,
            weight: g.weight,
            visibility: g.visibility,
          }))
        }
      }
    });

    return NextResponse.json(goalSet);
  } catch (error) {
    console.error('Error creating goal set:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
