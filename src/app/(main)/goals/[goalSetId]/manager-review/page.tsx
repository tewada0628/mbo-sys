import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { ManagerReviewForm } from '@/components/reviews/ManagerReviewForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getGoalSetAccessContext } from '@/lib/goal-access';

export default async function ManagerReviewPage({ params }: { params: Promise<{ goalSetId: string }> }) {
  const { goalSetId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const access = await getGoalSetAccessContext(user.email, goalSetId);
  if (!access.ok || !access.context.permissions.canView) {
    redirect('/dashboard');
  }

  const goalSet = await prisma.goalSet.findUnique({
    where: { id: goalSetId },
    include: {
      employee: true,
      membership: true,
      goals: {
        where: { isCurrent: true },
        orderBy: { goalType: 'asc' },
        include: {
          selfReview: true,
          managerReview: true,
        },
      },
    },
  });

  if (!goalSet) {
    redirect('/dashboard');
  }

  const isManager = access.context.permissions.canManagerReview;
  const isLocked = !goalSet.goals.every((goal) => goal.selfReview?.submittedAt);

  const serializedGoals = goalSet.goals.map((goal) => ({
    id: goal.id,
    goalType: goal.goalType,
    title: goal.title,
    description: goal.description,
    weight: Number(goal.weight),
    selfReview: goal.selfReview ? {
      score: Number(goal.selfReview.score),
      comment: goal.selfReview.comment,
      submittedAt: goal.selfReview.submittedAt?.toISOString() ?? null,
    } : null,
    managerReview: goal.managerReview ? {
      score: Number(goal.managerReview.score),
      comment: goal.managerReview.comment,
      submittedAt: goal.managerReview.submittedAt?.toISOString() ?? null,
    } : null,
  }));

  const cannotSubmitReason = !isManager
    ? '上長評価は直属上長のみ入力できます。'
    : goalSet.status !== 'APPROVED'
      ? '上長評価は承認済みの目標セットでのみ入力できます。'
      : goalSet.isEvaluationExempt || !goalSet.isMboTarget
        ? 'MBO対象外の目標セットは上長評価の対象外です。'
        : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">上長評価</h2>
          <p className="text-muted-foreground">{goalSet.employee.name} の期末上長評価</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/goals/${goalSet.id}`}>目標詳細へ戻る</Link>
        </Button>
      </div>

      {cannotSubmitReason ? (
        <Alert variant="destructive">
          <AlertTitle>入力できません</AlertTitle>
          <AlertDescription>{cannotSubmitReason}</AlertDescription>
        </Alert>
      ) : (
        <ManagerReviewForm goalSetId={goalSet.id} goals={serializedGoals} isLocked={isLocked} />
      )}
    </div>
  );
}
