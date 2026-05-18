import { redirect } from 'next/navigation';
import { BarChart2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodSelector } from '@/components/reports/PeriodSelector';

const GRADES = ['S', 'A', 'B', 'C', 'D'] as const;
type Grade = (typeof GRADES)[number];

const GRADE_TARGETS: Record<Grade, number> = {
  S: 5,
  A: 15,
  B: 60,
  C: 15,
  D: 5,
};

const GRADE_COLORS: Record<Grade, string> = {
  S: 'bg-purple-500',
  A: 'bg-blue-500',
  B: 'bg-[#01AEBB]',
  C: 'bg-yellow-400',
  D: 'bg-red-400',
};

const GRADE_TEXT_COLORS: Record<Grade, string> = {
  S: 'text-purple-700',
  A: 'text-blue-700',
  B: 'text-[#01AEBB]',
  C: 'text-yellow-700',
  D: 'text-red-600',
};

type Distribution = { grade: string; count: number; percentage: number };

function buildDistribution(records: { finalGrade: string | null }[]): Distribution[] {
  const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const r of records) {
    if (r.finalGrade && r.finalGrade in counts) counts[r.finalGrade]++;
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  return GRADES.map((g) => ({
    grade: g,
    count: counts[g],
    percentage: total > 0 ? Math.round((counts[g] / total) * 1000) / 10 : 0,
  }));
}

export default async function ReportsSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect('/login');

  const { roles } = await getActiveRoles(user.email);
  if (!hasAdminPrivilege(roles)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>アクセス権限がありません</AlertTitle>
        <AlertDescription>評価サマリは HR または ADMIN のみ利用できます。</AlertDescription>
      </Alert>
    );
  }

  const periods = await prisma.evaluationPeriod.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true },
  });

  const { periodId } = await searchParams;
  const selectedPeriodId = periodId ?? periods[0]?.id ?? null;

  let summaryData: {
    overall: { totalConfirmed: number; distribution: Distribution[] };
    byOrganization: { orgName: string; totalConfirmed: number; distribution: Distribution[] }[];
    byGrade: { grade: number; totalConfirmed: number; distribution: Distribution[] }[];
  } | null = null;

  if (selectedPeriodId) {
    const finalEvaluations = await prisma.finalEvaluation.findMany({
      where: {
        confirmedAt: { not: null },
        goalSet: { evaluationPeriodId: selectedPeriodId, isActive: true },
      },
      select: {
        finalGrade: true,
        goalSet: {
          select: {
            membership: {
              select: {
                grade: true,
                organizationSnapshot: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const overall = {
      totalConfirmed: finalEvaluations.length,
      distribution: buildDistribution(finalEvaluations),
    };

    const byOrgMap = new Map<string, typeof finalEvaluations>();
    for (const fe of finalEvaluations) {
      const orgName = fe.goalSet.membership.organizationSnapshot.name;
      if (!byOrgMap.has(orgName)) byOrgMap.set(orgName, []);
      byOrgMap.get(orgName)!.push(fe);
    }
    const byOrganization = Array.from(byOrgMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'ja'))
      .map(([orgName, records]) => ({
        orgName,
        totalConfirmed: records.length,
        distribution: buildDistribution(records),
      }));

    const byGradeMap = new Map<number, typeof finalEvaluations>();
    for (const fe of finalEvaluations) {
      const g = fe.goalSet.membership.grade;
      if (!byGradeMap.has(g)) byGradeMap.set(g, []);
      byGradeMap.get(g)!.push(fe);
    }
    const byGrade = Array.from(byGradeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([grade, records]) => ({
        grade,
        totalConfirmed: records.length,
        distribution: buildDistribution(records),
      }));

    summaryData = { overall, byOrganization, byGrade };
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">評価サマリ</h2>
        <p className="text-muted-foreground">部署・等級別の評価確定状況と総合評価の分布を確認できます。</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">評価期</span>
        <PeriodSelector periods={periods} selectedId={selectedPeriodId ?? ''} />
      </div>

      {!selectedPeriodId || !summaryData ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border bg-white text-gray-400">
          <BarChart2 className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm">評価期を選択してください</p>
        </div>
      ) : summaryData.overall.totalConfirmed === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border bg-white text-gray-400">
          <BarChart2 className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm">この評価期に確定済みの評価はありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 全社サマリ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">全社サマリ</CardTitle>
              <p className="text-sm text-muted-foreground">
                確定済み: <span className="font-semibold text-gray-900">{summaryData.overall.totalConfirmed} 名</span>
              </p>
            </CardHeader>
            <CardContent>
              <DistributionChart distribution={summaryData.overall.distribution} showTarget />
            </CardContent>
          </Card>

          {/* 組織別 */}
          {summaryData.byOrganization.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">組織別</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <DistributionTable
                  rows={summaryData.byOrganization.map((o) => ({
                    label: o.orgName,
                    total: o.totalConfirmed,
                    distribution: o.distribution,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* 等級別 */}
          {summaryData.byGrade.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">等級別</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <DistributionTable
                  rows={summaryData.byGrade.map((g) => ({
                    label: `等級 ${g.grade}`,
                    total: g.totalConfirmed,
                    distribution: g.distribution,
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function DistributionChart({
  distribution,
  showTarget = false,
}: {
  distribution: Distribution[];
  showTarget?: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* バーチャート */}
      <div className="flex h-8 w-full overflow-hidden rounded-md">
        {distribution.map((d) => {
          const grade = d.grade as Grade;
          return d.count > 0 ? (
            <div
              key={d.grade}
              className={`flex items-center justify-center text-xs font-bold text-white ${GRADE_COLORS[grade]}`}
              style={{ width: `${d.percentage}%` }}
              title={`${d.grade}: ${d.count}名 (${d.percentage}%)`}
            >
              {d.percentage >= 8 ? d.grade : ''}
            </div>
          ) : null;
        })}
      </div>

      {/* 凡例テーブル */}
      <div className="grid grid-cols-5 gap-2">
        {distribution.map((d) => {
          const grade = d.grade as Grade;
          return (
            <div key={d.grade} className="rounded-md border bg-gray-50 p-3 text-center">
              <p className={`text-xl font-bold ${GRADE_TEXT_COLORS[grade]}`}>{d.grade}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{d.count}<span className="text-sm font-normal text-gray-500">名</span></p>
              <p className="text-sm font-medium text-gray-700">{d.percentage}%</p>
              {showTarget && (
                <p className="mt-1 text-xs text-gray-400">目安 {GRADE_TARGETS[grade]}%</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DistributionTable({
  rows,
}: {
  rows: { label: string; total: number; distribution: Distribution[] }[];
}) {
  return (
    <table className="w-full min-w-[500px] text-sm">
      <thead className="bg-gray-50 text-xs text-gray-500">
        <tr>
          <th className="px-4 py-2 text-left font-medium">区分</th>
          <th className="w-16 px-4 py-2 text-center font-medium">確定</th>
          {GRADES.map((g) => (
            <th key={g} className={`w-16 px-4 py-2 text-center font-medium ${GRADE_TEXT_COLORS[g]}`}>
              {g}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row) => (
          <tr key={row.label} className="bg-white">
            <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
            <td className="px-4 py-3 text-center text-gray-600">{row.total}</td>
            {row.distribution.map((d) => (
              <td key={d.grade} className="px-4 py-3 text-center">
                {d.count > 0 ? (
                  <span className={`font-medium ${GRADE_TEXT_COLORS[d.grade as Grade]}`}>
                    {d.count}<span className="text-xs text-gray-400 ml-0.5">({d.percentage}%)</span>
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
