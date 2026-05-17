import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { GoalForm } from '@/components/goals/GoalForm';
import { Card, CardContent } from '@/components/ui/card';
import { getGoalSetAccessContext } from '@/lib/goal-access';

export default async function GoalRevisionPage({ params }: { params: Promise<{ goalSetId: string }> }) {
  const { goalSetId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const access = await getGoalSetAccessContext(user.email, goalSetId);
  if (!access.ok || !access.context.permissions.canRevise) {
    redirect('/dashboard');
  }

  const goalSet = await prisma.goalSet.findUnique({
    where: { id: goalSetId },
    include: {
      membership: true,
      goals: {
        where: { isCurrent: true },
        orderBy: { goalType: 'asc' }
      }
    }
  });

  if (!goalSet) {
    redirect('/dashboard');
  }

  // Revision is only allowed when status is APPROVED
  if (goalSet.status !== 'APPROVED') {
    return (
      <div className="container mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4">エラー</h2>
        <Card>
          <CardContent className="p-6">
            <p>目標修正申請は、目標が承認済みの状態（APPROVED）でのみ可能です。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format goals for the form
  const initialData = {
    goals: goalSet.goals.map((g) => ({
      title: g.title,
      description: g.description,
      goalType: g.goalType,
      kpiPattern: g.kpiPattern || undefined,
      criteria12: g.criteria12 || '',
      criteria10: g.criteria10 || '',
      criteria08: g.criteria08 || '',
      weight: Number(g.weight),
      visibility: g.visibility as "SELF_ONLY" | "DEPARTMENT" | "COMPANY",
    })),
    revisionReason: undefined,
    revisionNote: undefined,
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">目標修正申請</h2>
        <p className="text-muted-foreground">
          一度承認された目標の内容を変更する場合は、修正理由を添えて再度承認申請を行ってください。
        </p>
      </div>

      <GoalForm 
        initialData={initialData} 
        goalSetId={goalSetId} 
        isMboExempt={goalSet.isEvaluationExempt}
        isRevision={true}
      />
    </div>
  );
}
