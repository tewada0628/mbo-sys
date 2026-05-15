import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { GoalForm } from '@/components/goals/GoalForm';
import { ApprovalStepIndicator } from '@/components/goals/ApprovalStepIndicator';
import { GoalVersionHistory } from '@/components/goals/GoalVersionHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoalVisibilityBadge } from '@/components/goals/GoalVisibilityBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function GoalDetailPage({ params }: { params: Promise<{ goalSetId: string }> }) {
  const { goalSetId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const goalSet = await prisma.goalSet.findUnique({
    where: { id: goalSetId },
    include: {
      goals: {
        orderBy: [
          { isCurrent: 'desc' },
          { goalType: 'asc' }
        ]
      },
      employee: {
        include: {
          memberships: true
        }
      }
    }
  });

  if (!goalSet) {
    redirect('/dashboard');
  }

  const currentGoals = goalSet.goals.filter(g => g.isCurrent);
  const oldGoals = goalSet.goals.filter(g => !g.isCurrent);
  
  const isOwner = goalSet.employee.email === user.email;
  // Simplification for RBAC for now: assume we can edit if it's not approved and we are the owner
  const canEdit = isOwner && ['DRAFT', 'REJECTED', 'MEETING_REJECTED'].includes(goalSet.status);
  const isApproved = goalSet.status === 'APPROVED';

  // Format initialData for GoalForm
  const initialData = {
    goals: currentGoals.map(g => ({
      title: g.title,
      description: g.description,
      goalType: g.goalType,
      kpiPattern: g.kpiPattern || undefined,
      criteria12: g.criteria12 || '',
      criteria10: g.criteria10 || '',
      criteria08: g.criteria08 || '',
      weight: Number(g.weight),
      visibility: g.visibility as 'SELF_ONLY' | 'DEPARTMENT' | 'COMPANY',
    }))
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">目標詳細</h2>
          <p className="text-muted-foreground">{goalSet.employee.name} の目標セット</p>
        </div>
        <div className="flex gap-2">
          {isApproved && isOwner && (
            <Button asChild variant="outline">
              <Link href={`/goals/${goalSet.id}/revision`}>
                目標修正申請
              </Link>
            </Button>
          )}
        </div>
      </div>

      <ApprovalStepIndicator status={goalSet.status} />

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">目標詳細</TabsTrigger>
          <TabsTrigger value="history">バージョン履歴</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="mt-6">
          {canEdit ? (
            <GoalForm initialData={initialData} goalSetId={goalSet.id} isMboExempt={goalSet.isEvaluationExempt} />
          ) : (
            <div className="space-y-6">
              {currentGoals.map((goal, i) => (
                <div key={goal.id} className="border rounded-lg p-6 bg-card text-card-foreground">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{goal.goalType === 'ORG_CONTRIBUTION' ? '組織貢献目標' : `KPI連動目標 ${i + 1}`}</h3>
                    <div className="flex items-center gap-2">
                      <GoalVisibilityBadge visibility={goal.visibility} />
                      <Badge variant="outline">ウェイト: {Number(goal.weight)}%</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">タイトル</h4>
                      <p>{goal.title}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">詳細内容</h4>
                      <p className="whitespace-pre-wrap">{goal.description}</p>
                    </div>
                    {goal.kpiPattern && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">KPIパターン</h4>
                        <p>{goal.kpiPattern}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">1.2水準</h4>
                        <p className="text-sm whitespace-pre-wrap">{goal.criteria12 || '-'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">1.0水準</h4>
                        <p className="text-sm whitespace-pre-wrap">{goal.criteria10}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">0.8水準</h4>
                        <p className="text-sm whitespace-pre-wrap">{goal.criteria08 || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <GoalVersionHistory goals={oldGoals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
