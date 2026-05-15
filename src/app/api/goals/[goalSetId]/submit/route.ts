import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      include: {
        membership: true,
        employee: true
      }
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    if (goalSet.isEvaluationExempt) {
      return NextResponse.json({ error: 'MBO exempt users do not need approval' }, { status: 400 });
    }

    const validInitialStatuses = ['DRAFT', 'REJECTED', 'MEETING_REJECTED'];
    if (!validInitialStatuses.includes(goalSet.status)) {
      return NextResponse.json({ error: 'Cannot submit from current status' }, { status: 409 });
    }

    const managerId = goalSet.membership.managerId;
    if (!managerId) {
      return NextResponse.json({ error: 'No manager assigned for approval' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goalSet.update({
        where: { id: goalSet.id },
        data: { status: 'PENDING_MANAGER' }
      });

      await tx.approvalRequest.create({
        data: {
          requestType: 'GOAL_APPROVAL',
          goalSetId: goalSet.id,
          requesterId: goalSet.employeeId,
          approverId: managerId,
          status: 'PENDING'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting goal set:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
