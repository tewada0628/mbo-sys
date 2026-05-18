import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FileText, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { hasAdminPrivilege, isManager } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GoalType, EmployeeType, Role } from '@prisma/client';

const goalTypeLabels: Record<GoalType, string> = {
  KPI_1: 'KPI連動目標①',
  KPI_2: 'KPI連動目標②',
  ORG_CONTRIBUTION: '組織貢献目標',
};

const employeeTypeLabels: Record<EmployeeType, string> = {
  REGULAR: '正社員',
  CONTRACT: '契約社員',
  ASSISTANT: 'アシスタント',
};

const roleLabels: Record<Role, string> = {
  ADMIN: 'システム管理者',
  HR: '人事',
  MANAGER: 'マネージャー',
  TEAM_LEADER: 'チームリーダー',
  MEMBER: 'メンバー',
};

const gradeColors: Record<string, string> = {
  S: 'bg-purple-100 text-purple-800',
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-[#01AEBB]/10 text-[#01AEBB]',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-red-100 text-red-800',
};

const periodStatusLabels: Record<string, string> = {
  ACTIVE: '進行中',
  INACTIVE: '終了',
  ARCHIVED: 'アーカイブ',
};

async function canViewEmployee(viewerEmail: string, targetEmployeeId: string) {
  const now = new Date();
  const viewer = await prisma.employee.findUnique({
    where: { email: viewerEmail },
    select: {
      id: true,
      memberships: {
        where: {
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gt: now } }],
        },
        select: { roles: true },
      },
    },
  });
  if (!viewer) return false;
  if (viewer.id === targetEmployeeId) return true;

  const roles = viewer.memberships.flatMap((m) => m.roles);
  if (hasAdminPrivilege(roles)) return true;

  if (isManager(roles)) {
    const manages = await prisma.organizationMembership.findFirst({
      where: {
        employeeId: targetEmployeeId,
        OR: [
          { managerId: viewer.id },
          { divisionManagerId: viewer.id },
          { executiveId: viewer.id },
        ],
      },
    });
    if (manages) return true;
  }

  return false;
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const allowed = await canViewEmployee(user.email, employeeId);
  if (!allowed) {
    return (
      <Alert variant="destructive">
        <AlertTitle>アクセス権限がありません</AlertTitle>
        <AlertDescription>この社員のプロフィールを閲覧する権限がありません。</AlertDescription>
      </Alert>
    );
  }

  const now = new Date();

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      email: true,
      isActive: true,
      memberships: {
        where: {
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gt: now } }],
        },
        orderBy: { validFrom: 'desc' },
        take: 1,
        select: {
          grade: true,
          gradeType: true,
          position: true,
          employeeType: true,
          roles: true,
          joinDate: true,
          organizationSnapshot: { select: { name: true } },
          manager: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!employee) notFound();

  const goalSets = await prisma.goalSet.findMany({
    where: { employeeId, isActive: true },
    orderBy: [{ evaluationPeriod: { startDate: 'desc' } }],
    include: {
      evaluationPeriod: {
        select: { id: true, name: true, startDate: true, endDate: true, status: true },
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

  const membership = employee.memberships[0] ?? null;

  return (
    <div className="space-y-6 pb-12">
      {/* プロフィールカード */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#01AEBB]/10">
              <User className="h-7 w-7 text-[#01AEBB]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
                {!employee.isActive && (
                  <Badge variant="outline" className="text-gray-400">
                    退職済み
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500">社員番号: {employee.employeeCode}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {membership ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <ProfileField label="所属組織" value={membership.organizationSnapshot.name} />
              <ProfileField label="等級" value={`等級${membership.grade}（${membership.gradeType}）`} />
              <ProfileField label="役職" value={membership.position} />
              <ProfileField label="雇用形態" value={employeeTypeLabels[membership.employeeType]} />
              <ProfileField
                label="ロール"
                value={membership.roles.map((r) => roleLabels[r]).join('・')}
              />
              <ProfileField
                label="直属上長"
                value={membership.manager?.name ?? '（未設定）'}
              />
              <ProfileField
                label="入社日"
                value={format(membership.joinDate, 'yyyy年M月d日', { locale: ja })}
              />
            </dl>
          ) : (
            <p className="text-sm text-gray-400">現在有効な所属情報がありません。</p>
          )}
        </CardContent>
      </Card>

      {/* 評価履歴 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">評価履歴</h2>

        {goalSets.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border bg-white text-gray-500">
            <FileText className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm">評価記録はありません</p>
          </div>
        ) : (
          <div className="space-y-5">
            {goalSets.map((gs) => (
              <Card key={gs.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{gs.evaluationPeriod.name}</CardTitle>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {periodStatusLabels[gs.evaluationPeriod.status] ?? gs.evaluationPeriod.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {format(gs.evaluationPeriod.startDate, 'yyyy年M月', { locale: ja })}
                        {' 〜 '}
                        {format(gs.evaluationPeriod.endDate, 'yyyy年M月', { locale: ja })}
                      </p>
                    </div>
                    {gs.finalEvaluation?.finalGrade ? (
                      <div className="text-center">
                        <span className="text-xs text-gray-400">総合評価</span>
                        <div
                          className={`mt-1 flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${
                            gradeColors[gs.finalEvaluation.finalGrade] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {gs.finalEvaluation.finalGrade}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">
                        評価未確定
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {gs.finalEvaluation && (
                    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <ScoreCell label="MBOスコア" value={Number(gs.finalEvaluation.mboScore).toFixed(2)} />
                      <ScoreCell
                        label="360度（達成）"
                        value={gs.finalEvaluation.degree360AchievementBonus > 0
                          ? `+${gs.finalEvaluation.degree360AchievementBonus}`
                          : String(gs.finalEvaluation.degree360AchievementBonus)}
                      />
                      <ScoreCell
                        label="360度（クレド）"
                        value={gs.finalEvaluation.degree360CredoBonus > 0
                          ? `+${gs.finalEvaluation.degree360CredoBonus}`
                          : String(gs.finalEvaluation.degree360CredoBonus)}
                      />
                      <ScoreCell label="合計スコア" value={Number(gs.finalEvaluation.totalScore).toFixed(2)} highlight />
                    </div>
                  )}

                  {gs.goals.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        目標と評価スコア
                      </p>
                      <div className="overflow-hidden rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">目標</th>
                              <th className="w-16 px-4 py-2 text-center font-medium">比重</th>
                              <th className="w-20 px-4 py-2 text-center font-medium">自己評価</th>
                              <th className="w-20 px-4 py-2 text-center font-medium">上長評価</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {gs.goals.map((goal) => (
                              <tr key={goal.id} className="bg-white">
                                <td className="px-4 py-3">
                                  <p className="text-xs text-gray-400">{goalTypeLabels[goal.goalType]}</p>
                                  <p className="font-medium text-gray-900">{goal.title}</p>
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
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function ScoreCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 text-center ${highlight ? 'border-[#01AEBB]/30 bg-[#01AEBB]/5' : 'bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${highlight ? 'text-[#01AEBB]' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const label = score.toFixed(1);
  let className = 'inline-block rounded px-2 py-0.5 text-xs font-medium';
  if (score >= 1.5) className += ' bg-purple-100 text-purple-700';
  else if (score >= 1.0) className += ' bg-[#01AEBB]/10 text-[#01AEBB]';
  else className += ' bg-yellow-100 text-yellow-700';
  return <span className={className}>{label}</span>;
}
