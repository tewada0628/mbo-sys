import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        goalSet: {
          include: {
            membership: true,
          },
        },
        requester: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.approverId !== employee.id) {
      return NextResponse.json({ error: 'Not authorized to approve this request' }, { status: 403 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }

    const goalSet = request.goalSet;
    const membership = goalSet.membership;
    const isRevision = request.requestType === 'GOAL_REVISION';
    
    let nextStatus = goalSet.status;
    let nextApproverId: string | null = null;
    let isFinalApproval = false;

    // 1. Define the unique approval chain for this membership
    const fullChain = [
      membership.managerId,
      membership.divisionManagerId,
      membership.executiveId
    ].filter((id): id is string => !!id);
    
    // Unique chain to skip the same person appearing multiple times
    const uniqueChain: string[] = [];
    for (const id of fullChain) {
      if (!uniqueChain.includes(id)) {
        uniqueChain.push(id);
      }
    }

    // 2. Determine where we are and who is next
    const currentApproverId = employee.id;
    const currentIndex = uniqueChain.indexOf(currentApproverId);
    
    // If not in chain or last in chain, it's final
    const nextApproverInChainId = currentIndex !== -1 && currentIndex < uniqueChain.length - 1 
      ? uniqueChain[currentIndex + 1] 
      : null;

    if (!nextApproverInChainId) {
      isFinalApproval = true;
      nextStatus = 'APPROVED';
    } else {
      nextApproverId = nextApproverInChainId;
      // Map back to status based on role of the next person
      if (nextApproverId === membership.divisionManagerId) {
        nextStatus = 'PENDING_DIVISION';
      } else if (nextApproverId === membership.executiveId) {
        nextStatus = 'PENDING_EXECUTIVE';
      } else {
        // Fallback for unexpected case, though uniqueChain logic should prevent this
        nextStatus = isRevision ? 'APPROVED' : 'PENDING_DIVISION';
      }
    }

    // Special case: if we are in a REJECTED state (initial or revision), 
    // the first approval should always move to the next different person in the chain.
    // The logic above already handles this by finding the next person after the current approver.


    await prisma.$transaction(async (tx) => {
      // 1. Update current request
      await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          resolvedAt: new Date(),
        },
      });

      // 2. Update goal set status
      await tx.goalSet.update({
        where: { id: goalSet.id },
        data: {
          status: nextStatus as any,
        },
      });

      // 3. Create next request if not final
      if (nextApproverId && !isFinalApproval) {
        await tx.approvalRequest.create({
          data: {
            requestType: request.requestType,
            goalSetId: goalSet.id,
            requesterId: request.requesterId,
            approverId: nextApproverId,
            status: 'PENDING',
          },
        });

        // Notify next approver
        await tx.notification.create({
          data: {
            employeeId: nextApproverId,
            type: 'APPROVAL_REQUEST',
            message: `${request.requester.name}さんの目標設定の承認依頼が届いています。`,
          },
        });
      }

      // 4. Notify requester
      const requesterMessage = isFinalApproval
        ? 'あなたの目標設定が最終承認されました。'
        : 'あなたの目標設定が承認され、次のステップへ進みました。';

      await tx.notification.create({
        data: {
          employeeId: request.requesterId,
          type: isFinalApproval ? 'APPROVAL_COMPLETED' : 'APPROVAL_PROGRESSED',
          message: requesterMessage,
        },
      });

      // 5. If final revision approval, swap goals
      if (isRevision && isFinalApproval) {
        const goals = await tx.goal.findMany({
          where: { goalSetId: goalSet.id },
          select: { version: true }
        });
        const maxVersion = Math.max(...goals.map(g => g.version));

        // Set all current to false
        await tx.goal.updateMany({
          where: { goalSetId: goalSet.id, isCurrent: true },
          data: { isCurrent: false }
        });

        // Set new ones (the ones that were pending) to true
        await tx.goal.updateMany({
          where: { goalSetId: goalSet.id, version: maxVersion },
          data: { isCurrent: true }
        });
      }
    });

    return NextResponse.json({ success: true, nextStatus });
  } catch (error) {
    console.error('Error approving request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
