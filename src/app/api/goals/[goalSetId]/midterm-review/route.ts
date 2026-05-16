import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const { reviews, action } = await req.json();
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

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      include: {
        membership: true,
      },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    // Role check: Is the user the employee or the manager?
    const isEmployee = goalSet.employeeId === employee.id;
    const isManager = goalSet.membership.managerId === employee.id;

    if (!isEmployee && !isManager) {
      return NextResponse.json({ error: 'Not authorized to review this goal set' }, { status: 403 });
    }

    if (!Array.isArray(reviews)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const review of reviews) {
        // Upsert midterm review
        await tx.midtermReview.upsert({
          where: { goalId: review.goalId },
          update: {
            progress: review.progress ?? '',
            ...(isEmployee && { comment: review.comment }),
            ...(isManager && {
              managerComment: review.managerComment,
              revisionRequested: review.revisionRequested || false,
              revisionRequestNote: review.revisionRequestNote,
            }),
            ...(action === 'submit_employee' && isEmployee && { employeeSubmittedAt: now }),
            ...(action === 'submit_manager' && isManager && { managerSubmittedAt: now }),
          },
          create: {
            goalId: review.goalId,
            progress: review.progress ?? '',
            comment: isEmployee ? review.comment : null,
            managerComment: isManager ? review.managerComment : null,
            revisionRequested: isManager ? (review.revisionRequested || false) : false,
            revisionRequestNote: isManager ? review.revisionRequestNote : null,
            employeeSubmittedAt: (action === 'submit_employee' && isEmployee) ? now : null,
            managerSubmittedAt: (action === 'submit_manager' && isManager) ? now : null,
          },
        });
      }

      // If manager requests revision, update GoalSet status or trigger notification
      if (isManager && action === 'submit_manager') {
        const hasRevisionRequest = reviews.some((r: any) => r.revisionRequested);
        if (hasRevisionRequest) {
          await tx.notification.create({
            data: {
              employeeId: goalSet.employeeId,
              type: 'MIDTERM_REVISION_REQUESTED',
              message: '中間振り返りで上長から修正依頼が届いています。',
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating midterm reviews:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
