import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { GoalForm } from '@/components/goals/GoalForm';

export default async function NewGoalPage({
  searchParams,
}: {
  searchParams?: Promise<{ evaluationPeriodId?: string; periodId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedEvaluationPeriodId = resolvedSearchParams.evaluationPeriodId ?? resolvedSearchParams.periodId ?? null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const employee = await prisma.employee.findUnique({
    where: { email: user.email! },
    include: {
      memberships: {
        orderBy: {
          validFrom: 'desc',
        },
        include: {
          organizationSnapshot: {
            include: {
              evaluationPeriod: {
                include: {
                  phases: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!employee || employee.memberships.length === 0) {
    redirect('/dashboard');
  }

  const now = new Date();
  const activeMemberships = employee.memberships.filter((membership) => (
    membership.organizationSnapshot.evaluationPeriod.status === 'ACTIVE'
  ));
  const selectedMembership = requestedEvaluationPeriodId
    ? activeMemberships.find((membership) => (
        membership.organizationSnapshot.evaluationPeriodId === requestedEvaluationPeriodId
      ))
    : activeMemberships.find((membership) => (
        membership.organizationSnapshot.evaluationPeriod.phases.some((phase) => (
          phase.phaseType === 'GOAL_SETTING' &&
          phase.startDate <= now &&
          phase.endDate >= now
        ))
      )) ?? activeMemberships[0];

  if (!selectedMembership) {
    redirect('/dashboard');
  }

  const selectedEvaluationPeriodId = selectedMembership.organizationSnapshot.evaluationPeriodId;
  const isMboExempt = selectedMembership.employeeType !== 'REGULAR' || selectedMembership.grade <= 2;

  // Check if they already have an active GoalSet for this period
  const existingGoalSet = await prisma.goalSet.findFirst({
    where: {
      employeeId: employee.id,
      evaluationPeriodId: selectedEvaluationPeriodId,
      isActive: true,
    }
  });

  if (existingGoalSet) {
    redirect(`/goals/${existingGoalSet.id}`);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">目標設定 (新規作成)</h2>
        <p className="text-muted-foreground">
          {selectedMembership.organizationSnapshot.evaluationPeriod.name} の目標を設定してください。
        </p>
      </div>

      <GoalForm isMboExempt={isMboExempt} evaluationPeriodId={selectedEvaluationPeriodId} />
    </div>
  );
}
