import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getGoalSetAccessContext } from '@/lib/goal-access';
import { createNotification } from '@/lib/notifications';

export async function POST(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const { rejectionNote } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!rejectionNote || typeof rejectionNote !== 'string' || rejectionNote.trim() === '') {
      return NextResponse.json({ error: '差し戻し理由（rejectionNote）は必須です。' }, { status: 400 });
    }

    const access = await getGoalSetAccessContext(user.email, goalSetId);
    if (!access.ok) {
      return NextResponse.json({ error: access.failure.error }, { status: access.failure.status });
    }
    if (!access.context.permissions.canSavedReject) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      select: {
        id: true,
        employeeId: true,
        status: true,
        isMboTarget: true,
        isEvaluationExempt: true,
        membership: {
          select: {
            grade: true,
            employeeType: true,
          },
        },
      },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    const isExemptByMembership = goalSet.membership.employeeType !== 'REGULAR' || goalSet.membership.grade <= 2;
    const isExemptGoalSet = goalSet.isEvaluationExempt || !goalSet.isMboTarget || isExemptByMembership;

    if (goalSet.status !== 'SAVED' || !isExemptGoalSet) {
      return NextResponse.json({ error: '保存済みの申請対象外目標のみ修正依頼できます。' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goalSet.update({
        where: { id: goalSet.id },
        data: { status: 'REJECTED' },
      });

      await tx.approvalRequest.create({
        data: {
          requestType: 'MEETING_REJECTION',
          goalSetId: goalSet.id,
          requesterId: access.context.employee.id,
          approverId: access.context.employee.id,
          status: 'REJECTED',
          rejectionNote: rejectionNote.trim(),
          resolvedAt: new Date(),
        },
      });

      await createNotification({
        employeeId: goalSet.employeeId,
        type: 'SAVED_GOAL_REJECTED',
        message: '保存済み目標に上長から修正依頼が届いています。理由を確認して修正してください。',
        sendEmail: true,
        client: tx,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting saved goal set:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
