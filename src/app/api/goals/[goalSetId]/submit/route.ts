import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getGoalSetAccessContext } from '@/lib/goal-access';
import { canOperateInPhase, EVALUATION_PHASES, getCurrentPhase } from '@/lib/phases';

export async function POST(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await getGoalSetAccessContext(user.email, goalSetId);
    if (!access.ok) {
      return NextResponse.json({ error: access.failure.error }, { status: access.failure.status });
    }
    if (!access.context.permissions.canSubmit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentPhase = await getCurrentPhase(access.context.goalSet.evaluationPeriodId);
    if (!canOperateInPhase(access.context.roles, currentPhase?.phaseType, [EVALUATION_PHASES.GOAL_SETTING])) {
      return NextResponse.json({ error: '目標設定フェーズ外のため承認申請できません。' }, { status: 403 });
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

      await tx.notification.create({
        data: {
          employeeId: managerId,
          type: 'APPROVAL_REQUEST',
          message: `${goalSet.employee.name}さんの目標設定の承認依頼が届いています。`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting goal set:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
