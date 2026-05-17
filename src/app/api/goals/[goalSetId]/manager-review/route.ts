import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { managerReviewRequestSchema } from '@/lib/validations/review';
import { canOperateInPhase, EVALUATION_PHASES, getCurrentPhase } from '@/lib/phases';
import { getGoalSetAccessContext } from '@/lib/goal-access';

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
    if (!access.context.permissions.canManagerReview) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { employee, roles } = access.context;

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      include: {
        membership: true,
        goals: {
          where: { isCurrent: true },
          select: {
            id: true,
            selfReview: true,
          },
        },
      },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    if (goalSet.isEvaluationExempt || !goalSet.isMboTarget) {
      return NextResponse.json({ error: 'MBO対象外の目標セットは上長評価を提出できません。' }, { status: 403 });
    }

    if (goalSet.status !== 'APPROVED') {
      return NextResponse.json({ error: '承認済みの目標セットのみ上長評価を提出できます。' }, { status: 409 });
    }

    const currentPhase = await getCurrentPhase(goalSet.evaluationPeriodId);
    if (!canOperateInPhase(roles, currentPhase?.phaseType, [EVALUATION_PHASES.MANAGER_REVIEW])) {
      return NextResponse.json({ error: '上長評価フェーズ外のため提出できません。' }, { status: 403 });
    }

    const hasAllSelfReviews = goalSet.goals.every((goal) => goal.selfReview?.submittedAt);
    if (!hasAllSelfReviews) {
      return NextResponse.json({ error: '自己評価が提出されるまで上長評価は入力できません。' }, { status: 409 });
    }

    const body = await req.json();
    const result = managerReviewRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const currentGoals = new Map(goalSet.goals.map((goal) => [goal.id, goal]));
    const submittedGoalIds = new Set(result.data.reviews.map((review) => review.goalId));
    const hasInvalidGoal = result.data.reviews.some((review) => !currentGoals.has(review.goalId));

    if (hasInvalidGoal || submittedGoalIds.size !== currentGoals.size) {
      return NextResponse.json({ error: '現在の目標すべてに上長評価を入力してください。' }, { status: 400 });
    }

    const hasDifferenceWithoutComment = result.data.reviews.some((review) => {
      const goal = currentGoals.get(review.goalId);
      const selfScore = goal?.selfReview ? Number(goal.selfReview.score) : null;
      return selfScore !== null && selfScore !== review.score && !review.comment?.trim();
    });

    if (hasDifferenceWithoutComment) {
      return NextResponse.json({ error: '自己評価と異なるスコアを付ける場合は、上長コメントを入力してください。' }, { status: 400 });
    }

    const now = new Date();

    await prisma.$transaction(
      result.data.reviews.map((review) => (
        prisma.managerReview.upsert({
          where: { goalId: review.goalId },
          update: {
            managerId: employee.id,
            score: review.score,
            comment: review.comment,
            submittedAt: now,
          },
          create: {
            goalId: review.goalId,
            managerId: employee.id,
            score: review.score,
            comment: review.comment,
            submittedAt: now,
          },
        })
      )),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting manager review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
