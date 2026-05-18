import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params;
    const { rejectionNote } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!rejectionNote || typeof rejectionNote !== 'string' || rejectionNote.trim() === '') {
      return NextResponse.json({ error: '差し戻し理由（rejectionNote）は必須です。' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: user.email },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        goalSet: true,
        requester: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.approverId !== employee.id) {
      return NextResponse.json({ error: 'Not authorized to reject this request' }, { status: 403 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update current request
      await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          rejectionNote,
          resolvedAt: new Date(),
        },
      });

      // 2. Update goal set status
      // If rejecting a GOAL_REVISION, the goal set should remain APPROVED.
      // If rejecting a GOAL_APPROVAL, it becomes REJECTED.
      const newStatus = request.requestType === 'GOAL_REVISION' ? 'APPROVED' : 'REJECTED';
      await tx.goalSet.update({
        where: { id: request.goalSet.id },
        data: {
          status: newStatus,
        },
      });

      // 3. Write audit log
      await createAuditLog({
        actorId: employee.id,
        action: AUDIT_ACTIONS.GOAL_REJECTED,
        targetType: 'GOAL_SET',
        targetId: request.goalSet.id,
        beforeValue: { status: request.goalSet.status, requestType: request.requestType },
        afterValue: { status: newStatus, rejectionNote },
        client: tx,
      });

      // 4. Notify requester
      await createNotification({
        employeeId: request.requesterId,
        type: 'APPROVAL_REJECTED',
        message: '目標設定が差し戻されました。理由を確認して修正してください。',
        sendEmail: true,
        client: tx,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
