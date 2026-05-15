import { GoalCard } from '@/components/goals/GoalCard';
import prisma from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Calendar, CheckSquare, Clock, CheckCircle2 } from 'lucide-react';
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

  // 1. Get Current Evaluation Period & Phase
  const activePeriod = await prisma.evaluationPeriod.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      phases: {
        orderBy: { startDate: 'asc' },
      },
    },
  });

  const now = new Date();
  const currentPhase = activePeriod?.phases.find(
    (p) => p.startDate <= now && p.endDate >= now
  );

  const phaseNames: Record<string, string> = {
    GOAL_SETTING: '目標設定',
    MIDTERM: '中間振り返り',
    DEGREE_360: '360度評価',
    SELF_REVIEW: '自己評価',
    MANAGER_REVIEW: '上長評価',
    ADJUSTMENT: '評価調整・確定',
  };

  // 2. Get User's Goal Set for the active period
  const goalSet = activePeriod ? await prisma.goalSet.findFirst({
    where: { 
      employeeId: employee.id,
      evaluationPeriodId: activePeriod.id,
      isActive: true,
    },
    include: {
      goals: {
        where: { isCurrent: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  }) : null;

  // 3. Action Items Logic
  const actionItems: { title: string; desc: string; link: string; icon: any; color: string }[] = [];

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

  // 3-2. User action items based on Phase
  if (currentPhase) {
    // Goal Setting Phase
    if (currentPhase.phaseType === 'GOAL_SETTING') {
      if (!goalSet || goalSet.status === 'DRAFT' || goalSet.status === 'REJECTED' || goalSet.status === 'MEETING_REJECTED') {
        actionItems.push({
          title: '目標設定の入力',
          desc: '今期の目標を設定して申請してください',
          link: goalSet ? `/goals/${goalSet.id}` : '/goals/new',
          icon: AlertCircle,
          color: 'text-red-600 bg-red-50 border-red-200'
        });
      }
    }
    
    // Midterm Phase (Check revision request)
    if (currentPhase.phaseType === 'MIDTERM') {
      // Just an example check, normally we'd check if midterm review is submitted or revision is requested
      actionItems.push({
        title: '中間振り返りの実施',
        desc: '中間振り返りを入力してください',
        link: goalSet ? `/goals/${goalSet.id}` : '/',
        icon: Calendar,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
      });
    }

    // Self Review Phase
    if (currentPhase.phaseType === 'SELF_REVIEW') {
      actionItems.push({
        title: '自己評価の入力',
        desc: '期末の自己評価を入力してください',
        link: goalSet ? `/goals/${goalSet.id}/self-review` : '/',
        icon: CheckSquare,
        color: 'text-[#01AEBB] bg-[#01AEBB]/10 border-[#01AEBB]/20'
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">ダッシュボード</h2>
        
        {/* 現在フェーズ表示 */}
        {activePeriod && currentPhase && (
          <div className="flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 shadow-sm">
            <span className="text-sm font-medium text-gray-500">{activePeriod.name}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-bold text-[#01AEBB]">
              現在: {phaseNames[currentPhase.phaseType] || currentPhase.phaseType}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 自分の目標サマリ */}
        <div>
          <GoalCard goalSet={goalSet ? {
            id: goalSet.id,
            status: goalSet.status,
            goals: goalSet.goals.map(g => ({
              id: g.id,
              title: g.title,
              weight: Number(g.weight)
            }))
          } : null} />
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
