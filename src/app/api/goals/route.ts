import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { goalSetSchema } from '@/lib/validations/goal';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: user.email! },
      include: {
        memberships: {
          include: {
            organizationSnapshot: {
              include: { evaluationPeriod: true }
            }
          }
        }
      }
    });

    if (!employee || employee.memberships.length === 0) {
      return NextResponse.json({ error: 'No active membership found' }, { status: 400 });
    }

    const body = await req.json();
    const result = goalSetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const membership = employee.memberships[0];
    const isMboExempt = membership.employeeType !== 'REGULAR' || membership.grade <= 2;
    const initialStatus = isMboExempt ? 'SAVED' : 'DRAFT';

    const goalSet = await prisma.goalSet.create({
      data: {
        employeeId: employee.id,
        evaluationPeriodId: membership.organizationSnapshot.evaluationPeriodId,
        membershipId: membership.id,
        status: initialStatus,
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
