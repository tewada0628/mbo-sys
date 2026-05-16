import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { GoalSetListTable, type GoalSetListRow } from '@/components/goals/GoalSetListTable';
import { hasAdminPrivilege, isManager } from '@/lib/permissions';

export const revalidate = 0;

export default async function SubordinateGoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const now = new Date();
  const currentEmployee = await prisma.employee.findUnique({
    where: { email: user.email ?? '' },
    include: {
      memberships: {
        where: {
          validFrom: { lte: now },
          OR: [
            { validTo: null },
            { validTo: { gt: now } },
          ],
        },
      },
    },
  });

  if (!currentEmployee) {
    redirect('/login');
  }

  const roles = Array.from(new Set(currentEmployee.memberships.flatMap((membership) => membership.roles)));
  const currentOrganizationIds = Array.from(
    new Set(currentEmployee.memberships.map((membership) => membership.organizationSnapshotId)),
  );
  const visibilityConditions: Prisma.GoalSetWhereInput[] = [];

  if (currentOrganizationIds.length > 0) {
    visibilityConditions.push({
      membership: {
        organizationSnapshotId: { in: currentOrganizationIds },
      },
    });
  }

  if (isManager(roles)) {
    visibilityConditions.push({
      membership: {
        OR: [
          { managerId: currentEmployee.id },
          { divisionManagerId: currentEmployee.id },
          { executiveId: currentEmployee.id },
        ],
      },
    });
  }

  const goalSetWhere: Prisma.GoalSetWhereInput = {
    isActive: true,
    ...(hasAdminPrivilege(roles)
      ? {}
      : {
          OR: visibilityConditions.length > 0
            ? visibilityConditions
            : [{ employeeId: currentEmployee.id }],
        }),
  };

  const goalSets = await prisma.goalSet.findMany({
    where: goalSetWhere,
    include: {
      employee: true,
      evaluationPeriod: true,
      membership: {
        include: {
          organizationSnapshot: true,
        },
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
    orderBy: {
      employee: {
        name: 'asc',
      },
    },
  });

  const rows: GoalSetListRow[] = goalSets.map((goalSet) => {
    const reviewTarget = goalSet.isMboTarget && !goalSet.isEvaluationExempt;
    const hasGoals = goalSet.goals.length > 0;
    const selfReviewSubmitted = reviewTarget
      ? hasGoals && goalSet.goals.every((goal) => Boolean(goal.selfReview?.submittedAt))
      : null;
    const managerReviewSubmitted = reviewTarget
      ? hasGoals && goalSet.goals.every((goal) => Boolean(goal.managerReview?.submittedAt))
      : null;

    return {
      id: goalSet.id,
      employeeName: goalSet.employee.name,
      employeeCode: goalSet.employee.employeeCode,
      organizationName: goalSet.membership.organizationSnapshot.name,
      grade: goalSet.membership.grade,
      position: goalSet.membership.position,
      evaluationPeriodName: goalSet.evaluationPeriod.name,
      status: goalSet.status,
      isMboTarget: goalSet.isMboTarget,
      goalTitles: goalSet.goals.map((goal) => goal.title),
      selfReviewSubmitted,
      managerReviewSubmitted,
      mboScore: goalSet.finalEvaluation ? Number(goalSet.finalEvaluation.mboScore) : null,
      canManagerReview: Boolean(
        reviewTarget &&
        goalSet.status === 'APPROVED' &&
        goalSet.membership.managerId === currentEmployee.id &&
        selfReviewSubmitted,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">目標一覧（自部署）</h2>
        <p className="text-muted-foreground">
          自部署および承認・評価を担当するメンバーの目標セットを確認できます。
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-gray-50 py-12 text-center text-muted-foreground">
          表示できる目標セットが見つかりませんでした。
        </p>
      ) : (
        <GoalSetListTable rows={rows} />
      )}
    </div>
  );
}
