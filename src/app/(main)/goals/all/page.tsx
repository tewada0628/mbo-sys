import { redirect } from 'next/navigation';
import type { Prisma, GoalSetStatus } from '@prisma/client';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoalSetListTable, type GoalSetListRow } from '@/components/goals/GoalSetListTable';
import { AllGoalsFilter } from '@/components/goals/AllGoalsFilter';

export const revalidate = 0;

const GOAL_SET_STATUSES: GoalSetStatus[] = [
  'DRAFT',
  'SAVED',
  'PENDING_MANAGER',
  'PENDING_DIVISION',
  'PENDING_EXECUTIVE',
  'APPROVED',
  'REJECTED',
  'MEETING_REJECTED',
];

function isValidStatus(value: string): value is GoalSetStatus {
  return GOAL_SET_STATUSES.includes(value as GoalSetStatus);
}

export default async function AllGoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const { employee, roles } = await getActiveRoles(user.email);

  if (!employee || !hasAdminPrivilege(roles)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>アクセス権限がありません</AlertTitle>
        <AlertDescription>目標一覧（全社）は HR または ADMIN のみ利用できます。</AlertDescription>
      </Alert>
    );
  }

  const { periodId, status } = await searchParams;

  const [periods, goalSets] = await Promise.all([
    prisma.evaluationPeriod.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    }),
    prisma.goalSet.findMany({
      where: buildWhere(periodId, status),
      include: {
        employee: true,
        evaluationPeriod: true,
        membership: {
          include: { organizationSnapshot: true },
        },
        goals: {
          where: { isCurrent: true },
          orderBy: { goalType: 'asc' },
          include: {
            selfReview: true,
            managerReview: true,
          },
        },
        finalEvaluation: true,
      },
      orderBy: [
        { evaluationPeriod: { startDate: 'desc' } },
        { employee: { name: 'asc' } },
      ],
    }),
  ]);

  const rows: GoalSetListRow[] = goalSets.map((goalSet) => {
    const reviewTarget = goalSet.isMboTarget && !goalSet.isEvaluationExempt;
    const hasGoals = goalSet.goals.length > 0;
    const selfReviewSubmitted = reviewTarget
      ? hasGoals && goalSet.goals.every((g) => Boolean(g.selfReview?.submittedAt))
      : null;
    const managerReviewSubmitted = reviewTarget
      ? hasGoals && goalSet.goals.every((g) => Boolean(g.managerReview?.submittedAt))
      : null;

    return {
      id: goalSet.id,
      employeeId: goalSet.employee.id,
      employeeName: goalSet.employee.name,
      employeeCode: goalSet.employee.employeeCode,
      organizationName: goalSet.membership.organizationSnapshot.name,
      grade: goalSet.membership.grade,
      position: goalSet.membership.position,
      evaluationPeriodName: goalSet.evaluationPeriod.name,
      status: goalSet.status,
      isMboTarget: goalSet.isMboTarget,
      goalTitles: goalSet.goals.map((g) => g.title),
      selfReviewSubmitted,
      managerReviewSubmitted,
      mboScore: goalSet.finalEvaluation ? Number(goalSet.finalEvaluation.mboScore) : null,
      canManagerReview: false,
    };
  });

  const selectedPeriodId = periodId ?? '';
  const selectedStatus = status && isValidStatus(status) ? status : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">目標一覧（全社）</h2>
        <p className="text-muted-foreground">全社員の目標セットを確認・管理できます。</p>
      </div>

      <AllGoalsFilter
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        selectedStatus={selectedStatus}
      />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-gray-50 py-12 text-center text-muted-foreground">
          条件に一致する目標セットが見つかりませんでした。
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{rows.length} 件表示</p>
          <GoalSetListTable rows={rows} />
        </>
      )}
    </div>
  );
}

function buildWhere(
  periodId: string | undefined,
  status: string | undefined,
): Prisma.GoalSetWhereInput {
  const where: Prisma.GoalSetWhereInput = { isActive: true };

  if (periodId) {
    where.evaluationPeriodId = periodId;
  }

  if (status && isValidStatus(status)) {
    where.status = status;
  }

  return where;
}
