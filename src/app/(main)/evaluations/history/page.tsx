import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { History, FileText } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalType } from '@prisma/client';

const goalTypeLabels: Record<GoalType, string> = {
  KPI_1: 'KPI連動目標①',
  KPI_2: 'KPI連動目標②',
  ORG_CONTRIBUTION: '組織貢献目標',
};

const gradeColors: Record<string, string> = {
  S: 'bg-purple-100 text-purple-800',
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-[#01AEBB]/10 text-[#01AEBB]',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-red-100 text-red-800',
};

async function getEvaluationHistory(employeeId: string) {
  const goalSets = await prisma.goalSet.findMany({
    where: {
      employeeId,
      evaluationPeriod: {
        status: { in: ['INACTIVE', 'ARCHIVED'] },
      },
    },
    orderBy: [{ evaluationPeriod: { endDate: 'desc' } }],
    include: {
      evaluationPeriod: {
        select: { id: true, name: true, startDate: true, endDate: true },
      },
      goals: {
        where: { isCurrent: true },
        orderBy: { goalType: 'asc' },
        select: {
          id: true,
          goalType: true,
          title: true,
          weight: true,
          selfReview: { select: { score: true } },
          managerReview: { select: { score: true } },
        },
      },
      finalEvaluation: {
        select: {
          mboScore: true,
          totalScore: true,
          finalGrade: true,
          degree360AchievementBonus: true,
          degree360CredoBonus: true,
          confirmedAt: true,
        },
      },
    },
  });

  return goalSets;
}

export default async function EvaluationHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const employee = await prisma.employee.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  if (!employee) {
    redirect('/login');
  }

  const goalSets = await getEvaluationHistory(employee.id);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">過去の評価</h1>
        <p className="mt-1 text-sm text-gray-500">
          過去の評価期における評価結果を確認できます。
        </p>
      </div>

      {goalSets.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border bg-white text-gray-500">
          <History className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm">過去の評価記録はありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {goalSets.map((gs) => (
            <Card key={gs.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{gs.evaluationPeriod.name}</CardTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      {format(gs.evaluationPeriod.startDate, 'yyyy年M月', { locale: ja })}
                      {' 〜 '}
                      {format(gs.evaluationPeriod.endDate, 'yyyy年M月', { locale: ja })}
                    </p>
                  </div>
                  {gs.finalEvaluation?.finalGrade ? (
                    <div className="text-center">
                      <span className="text-xs text-gray-500">総合評価</span>
                      <div
                        className={`mt-1 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
                          gradeColors[gs.finalEvaluation.finalGrade] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {gs.finalEvaluation.finalGrade}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      評価未確定
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {gs.finalEvaluation ? (
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <ScoreCell
                      label="MBOスコア"
                      value={Number(gs.finalEvaluation.mboScore).toFixed(2)}
                    />
                    <ScoreCell
                      label="360度（達成）"
                      value={
                        gs.finalEvaluation.degree360AchievementBonus > 0
                          ? `+${gs.finalEvaluation.degree360AchievementBonus}`
                          : String(gs.finalEvaluation.degree360AchievementBonus)
                      }
                    />
                    <ScoreCell
                      label="360度（クレド）"
                      value={
                        gs.finalEvaluation.degree360CredoBonus > 0
                          ? `+${gs.finalEvaluation.degree360CredoBonus}`
                          : String(gs.finalEvaluation.degree360CredoBonus)
                      }
                    />
                    <ScoreCell
                      label="合計スコア"
                      value={Number(gs.finalEvaluation.totalScore).toFixed(2)}
                      highlight
                    />
                  </div>
                ) : null}

                {gs.goals.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      目標と評価スコア
                    </p>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">目標</th>
                            <th className="w-20 px-4 py-2 text-center font-medium">比重</th>
                            <th className="w-24 px-4 py-2 text-center font-medium">自己評価</th>
                            <th className="w-24 px-4 py-2 text-center font-medium">上長評価</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {gs.goals.map((goal) => (
                            <tr key={goal.id} className="bg-white">
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs text-gray-400">
                                    {goalTypeLabels[goal.goalType]}
                                  </span>
                                  <span className="font-medium text-gray-900">{goal.title}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {Number(goal.weight)}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                {goal.selfReview ? (
                                  <ScoreBadge score={Number(goal.selfReview.score)} />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {goal.managerReview ? (
                                  <ScoreBadge score={Number(goal.managerReview.score)} />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <FileText className="h-4 w-4" />
                    <span>目標データがありません</span>
                  </div>
                )}

                {gs.finalEvaluation?.confirmedAt && (
                  <p className="mt-3 text-right text-xs text-gray-400">
                    評価確定日:{' '}
                    {format(new Date(gs.finalEvaluation.confirmedAt), 'yyyy/MM/dd', { locale: ja })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-center ${
        highlight ? 'border-[#01AEBB]/30 bg-[#01AEBB]/5' : 'bg-white'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-0.5 text-lg font-bold ${highlight ? 'text-[#01AEBB]' : 'text-gray-800'}`}
      >
        {value}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const label = score.toFixed(1);
  let className = 'inline-block rounded px-2 py-0.5 text-xs font-medium';

  if (score >= 1.5) {
    className += ' bg-purple-100 text-purple-700';
  } else if (score >= 1.0) {
    className += ' bg-[#01AEBB]/10 text-[#01AEBB]';
  } else {
    className += ' bg-yellow-100 text-yellow-700';
  }

  return <span className={className}>{label}</span>;
}
