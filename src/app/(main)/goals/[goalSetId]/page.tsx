import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { GoalForm } from '@/components/goals/GoalForm';
import { ApprovalStepIndicator } from '@/components/goals/ApprovalStepIndicator';
import { GoalVersionHistory } from '@/components/goals/GoalVersionHistory';
import { GoalApprovalActions } from '@/components/goals/GoalApprovalActions';
import { MidtermReviewForm } from '@/components/reviews/MidtermReviewForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoalVisibilityBadge } from '@/components/goals/GoalVisibilityBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { RevisionReason } from '@/types';
export const revalidate = 0;

const REVISION_REASON_LABELS: Record<string, string> = {
  KPI_CHANGE: '全社／部門KPIの変更',
  STANDARD_DEVIATION: '目標設定の前提条件の変動による見直し',
  ROLE_CHANGE: '異動等による役割変更',
  MIDTERM_ENTRY: '期中入社',
  EARLY_CLOSURE: '早期クローズ',
  GRADE_PROMOTION: '期中昇格によるグレード変更',
};

const KPI_PATTERN_LABELS: Record<string, string> = {
  KPI_DECOMPOSITION: 'KPI分解',
  LEADING_INDICATOR: '先行指標化',
  ROLE_IN_GOAL: '役割分担',
  UPPER_GOAL: '上位目標の達成支援',
  TEAM_GROWTH: 'チーム・他者の成長支援',
};

export default async function GoalDetailPage({ params }: { params: Promise<{ goalSetId: string }> }) {
  const { goalSetId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentEmployee = await prisma.employee.findUnique({
    where: { email: user.email }
  });

  const goalSet = await prisma.goalSet.findUnique({
    where: { id: goalSetId },
    include: {
      goals: {
        orderBy: [
          { isCurrent: 'desc' },
          { goalType: 'asc' }
        ],
        include: {
          midtermReview: true,
        }
      },
      employee: {
        include: {
          memberships: true
        }
      },
      membership: true,
    }
  });

  if (!goalSet) {
    redirect('/dashboard');
  }

  const pendingRequest = await prisma.approvalRequest.findFirst({
    where: {
      goalSetId: goalSet.id,
      status: 'PENDING'
    }
  });

  const pendingRevision = pendingRequest?.requestType === 'GOAL_REVISION' ? pendingRequest : null;
  const isApprover = Boolean(currentEmployee && pendingRequest && pendingRequest.approverId === currentEmployee.id);

  const lastRejectedRequest = await prisma.approvalRequest.findFirst({
    where: {
      goalSetId: goalSet.id,
      status: 'REJECTED'
    },
    orderBy: {
      resolvedAt: 'desc'
    }
  });

  const lastApprovedRequest = await prisma.approvalRequest.findFirst({
    where: {
      goalSetId: goalSet.id,
      status: 'APPROVED'
    },
    orderBy: {
      resolvedAt: 'desc'
    }
  });

  const isLastRequestRejected = lastRejectedRequest && 
    (!lastApprovedRequest || (lastRejectedRequest.resolvedAt && lastApprovedRequest.resolvedAt && lastRejectedRequest.resolvedAt > lastApprovedRequest.resolvedAt)) &&
    (!pendingRequest || (lastRejectedRequest.resolvedAt && pendingRequest.requestedAt && lastRejectedRequest.resolvedAt > pendingRequest.requestedAt));
  const rejectedRevision = (isLastRequestRejected && lastRejectedRequest.requestType === 'GOAL_REVISION') ? lastRejectedRequest : null;

  const maxVersion = goalSet.goals.reduce((max, g) => (g.version > max ? g.version : max), 0);
  const pendingGoals = pendingRevision ? goalSet.goals.filter(g => g.version === maxVersion && !g.isCurrent) : [];
  const rejectedGoals = rejectedRevision ? goalSet.goals.filter(g => g.version === maxVersion && !g.isCurrent) : [];

  const currentGoals = goalSet.goals.filter(g => g.isCurrent);
  const oldGoals = goalSet.goals.filter(g => !g.isCurrent && (!pendingRevision || g.version < maxVersion) && (!rejectedRevision || g.version < maxVersion));
  
  const isOwner = goalSet.employee.email === user.email;
  // Simplification for RBAC for now: assume we can edit if it's not approved and we are the owner
  const canEdit = isOwner && ['DRAFT', 'REJECTED', 'MEETING_REJECTED'].includes(goalSet.status);
  const isApproved = goalSet.status === 'APPROVED' || !!pendingRevision;

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

  // Serialize goals to handle Decimal objects for Client Components
  const serializedGoals = currentGoals.map(g => ({
    ...g,
    weight: Number(g.weight),
    midtermReview: g.midtermReview ? {
      ...g.midtermReview,
      // Any other decimals in midtermReview? No.
    } : null
  }));

  // Get current phase to determine if midterm review should be shown
  const now = new Date();
  const currentPhase = await prisma.periodPhase.findFirst({
    where: {
      evaluationPeriodId: goalSet.evaluationPeriodId,
      startDate: { lte: now },
      endDate: { gte: now }
    }
  });

  const isMidtermPhase = currentPhase?.phaseType === 'MIDTERM';
  const isManager = Boolean(currentEmployee && goalSet.membership.managerId === currentEmployee.id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">目標詳細</h2>
          <p className="text-muted-foreground">{goalSet.employee.name} の目標セット</p>
        </div>
        <div className="flex gap-2 items-center">
          {isApprover && pendingRequest && (
            <div className="mr-4">
              <GoalApprovalActions request={pendingRequest} requesterName={goalSet.employee.name} />
            </div>
          )}
          {isApproved && isOwner && !pendingRevision && (
            <Button asChild variant="outline">
              <Link href={`/goals/${goalSet.id}/revision`}>
                目標修正申請
              </Link>
            </Button>
          )}
        </div>
      </div>

      {pendingRevision && (
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">修正申請中</AlertTitle>
          <AlertDescription className="text-amber-700">
            現在、目標の修正申請が承認待ちです。承認されるまで変更内容は有効化されません。
            申請中の新しい目標内容は「修正申請内容」タブから確認できます。
          </AlertDescription>
        </Alert>
      )}

      {isLastRequestRejected && (
        <Alert variant="destructive">
          <AlertTitle>差し戻し通知</AlertTitle>
          <AlertDescription>
            目標内容が差し戻されました。以下の理由を確認し、修正して再申請してください。
            <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20 font-medium text-sm">
              差し戻し理由: {lastRejectedRequest.rejectionNote}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isMidtermPhase && goalSet.goals.some(g => g.isCurrent && g.midtermReview?.revisionRequested) && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 font-bold">中間修正の依頼があります</AlertTitle>
          <AlertDescription className="text-red-700">
            中間振り返りにおいて、上長から一部の目標に対して修正依頼が出ています。「中間振り返り」タブまたは各目標のコメントを確認し、「目標修正申請」ボタンから修正を行ってください。
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-8">
        {pendingRevision && (
          <p className="text-sm font-medium text-amber-600 mb-2 ml-1">修正申請の進捗:</p>
        )}
        <ApprovalStepIndicator 
          status={goalSet.status} 
          isRevisionPending={!!pendingRevision} 
        />
      </div>

      <Tabs defaultValue={pendingRevision ? "pending" : rejectedRevision ? "rejected" : "current"}>
        <TabsList>
          {pendingRevision && <TabsTrigger value="pending" className="text-amber-600 data-[state=active]:text-amber-700">修正申請内容</TabsTrigger>}
          {rejectedRevision && <TabsTrigger value="rejected" className="text-destructive data-[state=active]:text-destructive">差し戻し内容</TabsTrigger>}
          <TabsTrigger value="current">現在の目標</TabsTrigger>
          {isMidtermPhase && <TabsTrigger value="midterm" className="text-blue-600 data-[state=active]:text-blue-700">中間振り返り</TabsTrigger>}
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
                        <p>{KPI_PATTERN_LABELS[goal.kpiPattern] || goal.kpiPattern}</p>
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
        {pendingRevision && (
          <TabsContent value="pending" className="mt-6">
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-amber-800 mb-4">修正申請の概要</h3>
                <div className="space-y-2">
                  <div><span className="font-semibold text-amber-800">修正理由:</span> <span className="text-amber-900">{REVISION_REASON_LABELS[pendingGoals[0]?.revisionReason || ''] || pendingGoals[0]?.revisionReason || '-'}</span></div>
                  <div><span className="font-semibold text-amber-800">修正内容:</span> <span className="text-amber-900">{pendingGoals[0]?.revisionNote || '-'}</span></div>
                </div>
              </div>
              {pendingGoals.map((goal, i) => (
                <div key={goal.id} className="border-2 border-amber-300 rounded-lg p-6 bg-card text-card-foreground">
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
                        <p>{KPI_PATTERN_LABELS[goal.kpiPattern] || goal.kpiPattern}</p>
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
          </TabsContent>
        )}
        {rejectedRevision && (
          <TabsContent value="rejected" className="mt-6">
            <div className="space-y-6">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-destructive mb-4">差し戻しの詳細</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold">差し戻し日:</span> {rejectedRevision.resolvedAt ? format(new Date(rejectedRevision.resolvedAt), 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}</div>
                  <div><span className="font-semibold text-destructive">差し戻し理由:</span> <span className="font-medium">{rejectedRevision.rejectionNote}</span></div>
                </div>
              </div>
              {rejectedGoals.map((goal, i) => (
                <div key={goal.id} className="border-2 border-destructive/30 rounded-lg p-6 bg-card text-card-foreground opacity-80">
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
                        <p>{KPI_PATTERN_LABELS[goal.kpiPattern] || goal.kpiPattern}</p>
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
          </TabsContent>
        )}
        {isMidtermPhase && (
          <TabsContent value="midterm" className="mt-6">
            <MidtermReviewForm 
              goalSetId={goalSet.id} 
              goals={serializedGoals as any} 
              isManager={isManager} 
              isEmployee={isOwner} 
            />
          </TabsContent>
        )}
        <TabsContent value="history" className="mt-6">
          <GoalVersionHistory goals={oldGoals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
