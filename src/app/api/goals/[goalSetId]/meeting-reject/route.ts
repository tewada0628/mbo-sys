import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getGoalSetAccessContext } from '@/lib/goal-access';
import { createNotification } from '@/lib/notifications';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

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
    if (!access.context.permissions.canMeetingReject) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { employee } = access.context;

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      include: { membership: true },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    if (goalSet.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Can only meeting-reject from APPROVED status' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goalSet.update({
        where: { id: goalSet.id },
        data: { status: 'MEETING_REJECTED' },
      });

      await tx.approvalRequest.create({
        data: {
          requestType: 'MEETING_REJECTION',
          goalSetId: goalSet.id,
          requesterId: employee.id,
          approverId: employee.id,
          status: 'REJECTED',
          rejectionNote: rejectionNote.trim(),
          resolvedAt: new Date(),
        },
      });

      await createNotification({
        employeeId: goalSet.employeeId,
        type: 'MEETING_REJECTED',
        message: '難易度調整のため、承認済み目標が差し戻されました。差し戻し理由を確認してください。',
        sendEmail: true,
        client: tx,
      });

      await createAuditLog({
        actorId: employee.id,
        action: AUDIT_ACTIONS.GOAL_MEETING_REJECTED,
        targetType: 'GOAL_SET',
        targetId: goalSet.id,
        beforeValue: { status: 'APPROVED' },
        afterValue: { status: 'MEETING_REJECTED', rejectionNote: rejectionNote.trim() },
        client: tx,
      });

      if (goalSet.membership.managerId && goalSet.membership.managerId !== goalSet.employeeId) {
        await createNotification({
          employeeId: goalSet.membership.managerId,
          type: 'MEETING_REJECTED',
          message: '担当社員の承認済み目標が最終承認後に差し戻されました。',
          sendEmail: true,
          client: tx,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting goal set:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
