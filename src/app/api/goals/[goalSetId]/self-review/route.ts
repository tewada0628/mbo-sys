import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { selfReviewRequestSchema } from '@/lib/validations/review';

export async function POST(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
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
        membership: {
          select: { managerId: true },
        },
        goals: {
          where: { isCurrent: true },
          select: {
            id: true,
            selfReview: {
              select: { submittedAt: true },
            },
          },
        },
      },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    if (goalSet.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (goalSet.isEvaluationExempt || !goalSet.isMboTarget) {
      return NextResponse.json({ error: 'MBO対象外の目標セットは自己評価を提出できません。' }, { status: 403 });
    }

    if (goalSet.status !== 'APPROVED') {
      return NextResponse.json({ error: '承認済みの目標セットのみ自己評価を提出できます。' }, { status: 409 });
    }

    const body = await req.json();
    const result = selfReviewRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const currentGoalIds = new Set(goalSet.goals.map((goal) => goal.id));
    const submittedGoalIds = new Set(result.data.reviews.map((review) => review.goalId));
    const hasInvalidGoal = result.data.reviews.some((review) => !currentGoalIds.has(review.goalId));

    if (hasInvalidGoal || submittedGoalIds.size !== currentGoalIds.size) {
      return NextResponse.json({ error: '現在の目標すべてに自己評価を入力してください。' }, { status: 400 });
    }

    const now = new Date();
    const wasAlreadySubmitted = goalSet.goals.every((goal) => goal.selfReview?.submittedAt);

    await prisma.$transaction(async (tx) => {
      for (const review of result.data.reviews) {
        await tx.selfReview.upsert({
          where: { goalId: review.goalId },
          update: {
            score: review.score,
            comment: review.comment,
            submittedAt: now,
          },
          create: {
            goalId: review.goalId,
            score: review.score,
            comment: review.comment,
            submittedAt: now,
          },
        });
      }

      if (!wasAlreadySubmitted && goalSet.membership.managerId) {
        await tx.notification.create({
          data: {
            employeeId: goalSet.membership.managerId,
            type: 'SELF_REVIEW_SUBMITTED',
            message: `${employee.name}さんの自己評価が提出されました。上長評価を入力してください。`,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting self review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
