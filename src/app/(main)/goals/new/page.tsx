import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { GoalForm } from '@/components/goals/GoalForm';

export default async function NewGoalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const employee = await prisma.employee.findUnique({
    where: { email: user.email! },
    include: {
      memberships: {
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

  // Assuming active membership for current period
  const activeMembership = employee.memberships[0];
  const isMboExempt = activeMembership.employeeType !== 'REGULAR' || activeMembership.grade <= 2;

  // Check if they already have an active GoalSet for this period
  const existingGoalSet = await prisma.goalSet.findFirst({
    where: {
      employeeId: employee.id,
      evaluationPeriodId: activeMembership.organizationSnapshot.evaluationPeriodId,
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
          {activeMembership.organizationSnapshot.evaluationPeriod.name} の目標を設定してください。
        </p>
      </div>

      <GoalForm isMboExempt={isMboExempt} />
    </div>
  );
}
