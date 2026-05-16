import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { goalSetSchema } from '@/lib/validations/goal';
import { ApprovalRequestType, ApprovalStatus } from '@prisma/client';

export async function POST(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: user.email! },
      include: {
        memberships: {
          where: { validTo: null }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await req.json();
    const result = goalSetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    // Revision reason and note are required for a revision
    if (!result.data.revisionReason || !result.data.revisionNote) {
      return NextResponse.json({ error: '修正理由と修正内容の詳細を入力してください' }, { status: 400 });
    }

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      include: {
        membership: true,
        goals: true,
      }
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    if (goalSet.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (goalSet.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Only APPROVED goal sets can be revised' }, { status: 409 });
    }

    // Check if there's already a pending revision request
    const pendingRequest = await prisma.approvalRequest.findFirst({
      where: {
        goalSetId: goalSet.id,
        requestType: ApprovalRequestType.GOAL_REVISION,
        status: ApprovalStatus.PENDING,
      }
    });

    if (pendingRequest) {
      return NextResponse.json({ error: '既に申請中の修正リクエストが存在します' }, { status: 409 });
    }

    const approverId = goalSet.membership.managerId;
    if (!approverId) {
      return NextResponse.json({ error: 'Manager not assigned' }, { status: 422 });
    }

    // Determine the highest version currently available
    const maxVersion = goalSet.goals.reduce((max, g) => (g.version > max ? g.version : max), 0);
    const newVersion = maxVersion + 1;

    // Use a transaction to safely create the goals and the approval request
    await prisma.$transaction(async (tx) => {
      // 1. Create new goals with is_current = false
      for (const g of result.data.goals) {
        await tx.goal.create({
          data: {
            goalSetId: goalSet.id,
            goalType: g.goalType,
            version: newVersion,
            isCurrent: false, // The revision is pending
            title: g.title,
            description: g.description,
            kpiPattern: g.kpiPattern,
            criteria12: g.criteria12,
            criteria10: g.criteria10,
            criteria08: g.criteria08,
            weight: g.weight,
            visibility: g.visibility,
            revisionReason: result.data.revisionReason,
            revisionNote: result.data.revisionNote,
          }
        });
      }

      // 2. Create the approval request
      await tx.approvalRequest.create({
        data: {
          requestType: ApprovalRequestType.GOAL_REVISION,
          goalSetId: goalSet.id,
          requesterId: goalSet.employeeId,
          approverId: approverId,
          status: ApprovalStatus.PENDING,
        }
      });

      // 3. Update goal set status to reflect the revision progress
      await tx.goalSet.update({
        where: { id: goalSet.id },
        data: { status: 'PENDING_MANAGER' }
      });
    });

    return NextResponse.json({ success: true, message: 'Revision requested successfully' });
  } catch (error: any) {
    console.error('Error creating revision:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
