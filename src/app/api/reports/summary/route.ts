import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';

const GRADES = ['S', 'A', 'B', 'C', 'D'] as const;

function buildDistribution(records: { finalGrade: string | null }[]) {
  const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const r of records) {
    if (r.finalGrade && r.finalGrade in counts) {
      counts[r.finalGrade]++;
    }
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  return GRADES.map((g) => ({
    grade: g,
    count: counts[g],
    percentage: total > 0 ? Math.round((counts[g] / total) * 1000) / 10 : 0,
  }));
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roles } = await getActiveRoles(user.email);
    if (!hasAdminPrivilege(roles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const periodId = url.searchParams.get('periodId');

    if (!periodId) {
      return NextResponse.json({ error: 'periodId is required' }, { status: 400 });
    }

    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: periodId },
      select: { id: true, name: true },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    const finalEvaluations = await prisma.finalEvaluation.findMany({
      where: {
        confirmedAt: { not: null },
        goalSet: { evaluationPeriodId: periodId, isActive: true },
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

    // 全社分布
    const overall = {
      totalConfirmed: finalEvaluations.length,
      distribution: buildDistribution(finalEvaluations),
    };

    // 組織別集計
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

    // 等級別集計（等級3以上 = MBO対象）
    const byGradeMap = new Map<number, typeof finalEvaluations>();
    for (const fe of finalEvaluations) {
      const grade = fe.goalSet.membership.grade;
      if (!byGradeMap.has(grade)) byGradeMap.set(grade, []);
      byGradeMap.get(grade)!.push(fe);
    }
    const byGrade = Array.from(byGradeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([grade, records]) => ({
        grade,
        totalConfirmed: records.length,
        distribution: buildDistribution(records),
      }));

    return NextResponse.json({ period, overall, byOrganization, byGrade });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
