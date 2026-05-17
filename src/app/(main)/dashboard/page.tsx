import { GoalCard } from '@/components/goals/GoalCard';
import prisma from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Calendar, CheckSquare, Clock, CheckCircle2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect('/login');
  }

  const employee = await prisma.employee.findUnique({
    where: { email: user.email },
  });

  if (!employee) {
    return <div>従業員情報が見つかりません。</div>;
  }

  // 1. Get ALL Active Evaluation Periods & Phases
  const activePeriods = await prisma.evaluationPeriod.findMany({
    where: { status: 'ACTIVE' },
    include: {
      phases: {
        orderBy: { startDate: 'asc' },
      },
    },
  });

  const now = new Date();
  const currentPhases = activePeriods.flatMap(period => 
    period.phases.filter(p => p.startDate <= now && p.endDate >= now)
      .map(p => ({ ...p, periodName: period.name }))
  );

  const phaseNames: Record<string, string> = {
    GOAL_SETTING: '目標設定',
    MIDTERM: '中間振り返り',
    DEGREE_360: '360度評価',
    SELF_REVIEW: '自己評価',
    MANAGER_REVIEW: '上長評価',
    ADJUSTMENT: '評価調整・確定',
  };
  const goalSettingPhase = currentPhases.find((phase) => phase.phaseType === 'GOAL_SETTING');
  const newGoalHref = goalSettingPhase
    ? `/goals/new?evaluationPeriodId=${goalSettingPhase.evaluationPeriodId}`
    : '/goals/new';

  // 2. Get User's Goal Sets for all active periods
  const goalSets = await prisma.goalSet.findMany({
    where: { 
      employeeId: employee.id,
      evaluationPeriodId: { in: activePeriods.map(p => p.id) },
      isActive: true,
    },
    include: {
      goals: {
        where: { isCurrent: true },
        orderBy: { createdAt: 'asc' },
        include: {
          midtermReview: true,
          selfReview: true,
          managerReview: true,
        },
      },
      evaluationPeriod: true,
    }
  });
  
  // 3. Action Items Logic
  const actionItems: { title: string; desc: string; link: string; icon: LucideIcon; color: string }[] = [];
  
  let primaryGoalSetFlags = {
    hasRejectedRevision: false,
    isRevisionPending: false
  };

  // Check for rejections/actions for each goal set
  for (let i = 0; i < goalSets.length; i++) {
    const gs = goalSets[i];
    const lastRejectedRevision = await prisma.approvalRequest.findFirst({
      where: {
        goalSetId: gs.id,
        status: 'REJECTED',
        requestType: 'GOAL_REVISION'
      },
      orderBy: { resolvedAt: 'desc' }
    });

    const lastApprovedRevision = await prisma.approvalRequest.findFirst({
      where: {
        goalSetId: gs.id,
        status: 'APPROVED',
        requestType: 'GOAL_REVISION'
      },
      orderBy: { resolvedAt: 'desc' }
    });

    const pendingRequest = await prisma.approvalRequest.findFirst({
      where: {
        goalSetId: gs.id,
        status: 'PENDING'
      },
      orderBy: { requestedAt: 'desc' }
    });

    const hasRejectedRevision = !!(
      lastRejectedRevision && 
      (!lastApprovedRevision || (lastRejectedRevision.resolvedAt && lastApprovedRevision.resolvedAt && lastRejectedRevision.resolvedAt > lastApprovedRevision.resolvedAt)) &&
      (!pendingRequest || (lastRejectedRevision.resolvedAt && pendingRequest.requestedAt && lastRejectedRevision.resolvedAt > pendingRequest.requestedAt))
    );

    const isRevisionPending = !!(pendingRequest && pendingRequest.requestType === 'GOAL_REVISION');

    // For the primary (first) goal set, store flags for the GoalCard
    if (i === 0) {
      primaryGoalSetFlags = { hasRejectedRevision, isRevisionPending };
    }

    if (hasRejectedRevision) {
      actionItems.push({
        title: `[${gs.evaluationPeriod.name}] 目標修正の差し戻し確認`,
        desc: '目標修正申請が差し戻されました。内容を確認して再申請してください。',
        link: `/goals/${gs.id}`,
        icon: AlertCircle,
        color: 'text-red-600 bg-red-50 border-red-200'
      });
    } else if (gs.status === 'REJECTED' || gs.status === 'MEETING_REJECTED') {
      actionItems.push({
        title: `[${gs.evaluationPeriod.name}] 目標設定の差し戻し確認`,
        desc: '目標設定が差し戻されました。理由を確認して再申請してください。',
        link: `/goals/${gs.id}`,
        icon: AlertCircle,
        color: 'text-red-600 bg-red-50 border-red-200'
      });
    }
  }

  // 3-1. Pending Approvals (Manager/Approver role)
  const pendingApprovals = await prisma.approvalRequest.count({
    where: {
      approverId: employee.id,
      status: 'PENDING'
    }
  });

  if (pendingApprovals > 0) {
    actionItems.push({
      title: '承認待ちの申請',
      desc: `${pendingApprovals}件の申請が承認待ちです`,
      link: '/approvals',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    });
  }

  // 3-2. Subordinate self reviews that are ready for manager review
  const subordinateGoalSetsReadyForManagerReview = await prisma.goalSet.findMany({
    where: {
      evaluationPeriodId: { in: activePeriods.map(p => p.id) },
      isActive: true,
      status: 'APPROVED',
      membership: {
        managerId: employee.id,
      },
    },
    include: {
      goals: {
        where: { isCurrent: true },
        include: {
          selfReview: true,
          managerReview: true,
        },
      },
    },
  });

  const pendingManagerReviewCount = subordinateGoalSetsReadyForManagerReview.filter((goalSet) => {
    const hasAllSelfReviews = goalSet.goals.every((goal) => goal.selfReview?.submittedAt);
    const hasAllManagerReviews = goalSet.goals.every((goal) => goal.managerReview?.submittedAt);
    return hasAllSelfReviews && !hasAllManagerReviews;
  }).length;

  if (pendingManagerReviewCount > 0) {
    actionItems.push({
      title: '部下の自己評価が提出されました',
      desc: `${pendingManagerReviewCount}件の上長評価を入力できます`,
      link: '/goals',
      icon: CheckSquare,
      color: 'text-purple-700 bg-purple-50 border-purple-200'
    });
  }

  // 3-3. User action items based on Phase(s)
  for (const phase of currentPhases) {
    const periodGoalSet = goalSets.find(gs => gs.evaluationPeriodId === phase.evaluationPeriodId);
    const isReviewTarget = !!periodGoalSet && periodGoalSet.isMboTarget && !periodGoalSet.isEvaluationExempt;
    
    // Goal Setting Phase
    if (phase.phaseType === 'GOAL_SETTING') {
      const needsGoalInput = !periodGoalSet || periodGoalSet.status === 'DRAFT' || (
        periodGoalSet.status === 'SAVED' && isReviewTarget
      );

      if (needsGoalInput) {
        actionItems.push({
          title: `[${phase.periodName}] 目標設定の入力`,
          desc: '今期の目標を設定して申請してください',
          link: periodGoalSet ? `/goals/${periodGoalSet.id}` : `/goals/new?evaluationPeriodId=${phase.evaluationPeriodId}`,
          icon: AlertCircle,
          color: 'text-red-600 bg-red-50 border-red-200'
        });
      }
    }
    
    // Midterm Phase (Check revision request)
    if (phase.phaseType === 'MIDTERM') {
      const hasMidtermRevisionRequest = periodGoalSet?.goals.some(g => g.midtermReview?.revisionRequested);
      const isMidtermSubmitted = periodGoalSet?.goals.every(g => g.midtermReview?.employeeSubmittedAt);
      
      if (hasMidtermRevisionRequest) {
        actionItems.push({
          title: `[${phase.periodName}] 中間修正の依頼あり`,
          desc: '上長から目標の修正依頼が届いています。内容を確認して修正してください',
          link: `/goals/${periodGoalSet?.id}`,
          icon: AlertCircle,
          color: 'text-red-600 bg-red-50 border-red-200'
        });
      } else if (isReviewTarget && !isMidtermSubmitted) {
        actionItems.push({
          title: `[${phase.periodName}] 中間振り返りの実施`,
          desc: '中間振り返りを入力してください',
          link: periodGoalSet ? `/goals/${periodGoalSet.id}` : '/',
          icon: Calendar,
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        });
      }
    }

    // Self Review Phase
    if (phase.phaseType === 'SELF_REVIEW') {
      const isSelfReviewSubmitted = periodGoalSet?.goals.every(g => g.selfReview?.submittedAt);

      if (isReviewTarget && !isSelfReviewSubmitted) {
        actionItems.push({
          title: `[${phase.periodName}] 自己評価の入力`,
          desc: '期末の自己評価を入力してください',
          link: `/goals/${periodGoalSet.id}/self-review`,
          icon: CheckSquare,
          color: 'text-[#01AEBB] bg-[#01AEBB]/10 border-[#01AEBB]/20'
        });
      }
    }

  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">ダッシュボード</h2>
        
        {/* 現在フェーズ表示 */}
        <div className="flex flex-wrap gap-2">
          {currentPhases.map((phase, i) => (
            <div key={i} className="flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 shadow-sm">
              <span className="text-sm font-medium text-gray-500">{phase.periodName}</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-bold text-[#01AEBB]">
                現在: {phaseNames[phase.phaseType] || phase.phaseType}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 自分の目標サマリ */}
        <div>
          {goalSets.length > 0 ? (
            <GoalCard 
              goalSet={{
                id: goalSets[0].id,
                status: goalSets[0].status,
                goals: goalSets[0].goals.map(g => ({
                  id: g.id,
                  title: g.title,
                  weight: Number(g.weight)
                }))
              }} 
              hasRejectedRevision={primaryGoalSetFlags.hasRejectedRevision}
              isRevisionPending={primaryGoalSetFlags.isRevisionPending}
              createHref={newGoalHref}
            />
          ) : (
            <GoalCard goalSet={null} hasRejectedRevision={false} isRevisionPending={false} createHref={newGoalHref} />
          )}
        </div>

        {/* 対応事項リスト */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-gray-500" />
                対応事項
                {actionItems.length > 0 && (
                  <Badge className="ml-2 bg-red-500 hover:bg-red-600">
                    {actionItems.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionItems.length > 0 ? (
                <div className="space-y-3">
                  {actionItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <Link key={i} href={item.link}>
                        <div className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-opacity-80 ${item.color.split(' ').slice(1).join(' ')}`}>
                          <div className={`mt-0.5 ${item.color.split(' ')[0]}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className={`text-sm font-bold ${item.color.split(' ')[0]}`}>{item.title}</h4>
                            <p className="mt-1 text-xs text-gray-600">{item.desc}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600">現在必要な対応はありません</p>
                  <p className="text-xs text-gray-400 mt-1">すべてのタスクが完了しています</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
