import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { calculateEvaluationScore } from '@/lib/score';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roles } = await getActiveRoles(user.email);
    if (!hasAdminPrivilege(roles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const activePeriods = await prisma.evaluationPeriod.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const goalSets = await prisma.goalSet.findMany({
      where: {
        evaluationPeriodId: { in: activePeriods.map((period) => period.id) },
        isActive: true,
        isMboTarget: true,
        isEvaluationExempt: false,
        status: 'APPROVED',
      },
      include: {
        employee: {
          include: {
            degree360Scores: true,
          },
        },
        evaluationPeriod: true,
        membership: true,
        finalEvaluation: true,
        goals: {
          where: { isCurrent: true },
          orderBy: { goalType: 'asc' },
          include: {
            managerReview: true,
          },
        },
      },
      orderBy: [
        { evaluationPeriod: { startDate: 'desc' } },
        { employee: { name: 'asc' } },
      ],
    });

    const items = goalSets.map((goalSet) => {
      const degree360Score = goalSet.employee.degree360Scores.find((score) => (
        score.evaluationPeriodId === goalSet.evaluationPeriodId
      ));
      const preview = calculateEvaluationScore(
        goalSet.goals.map((goal) => ({
          weight: Number(goal.weight),
          score: goal.managerReview ? Number(goal.managerReview.score) : null,
        })),
        degree360Score ? {
          achievementScore: Number(degree360Score.achievementScore),
          credoScore: Number(degree360Score.credoScore),
          isTop20Achievement: degree360Score.isTop20Achievement,
        } : null,
        goalSet.membership.grade,
      );

      return {
        goalSetId: goalSet.id,
        employeeCode: goalSet.employee.employeeCode,
        employeeName: goalSet.employee.name,
        evaluationPeriodName: goalSet.evaluationPeriod.name,
        grade: goalSet.membership.grade,
        mboScore: preview.mboScore,
        degree360AchievementBonus: preview.degree360AchievementBonus,
        degree360CredoBonus: preview.degree360CredoBonus,
        totalScore: preview.totalScore,
        isComplete: preview.isComplete,
        finalGrade: goalSet.finalEvaluation?.finalGrade ?? null,
        adjustmentNote: goalSet.finalEvaluation?.adjustmentNote ?? '',
        confirmedAt: goalSet.finalEvaluation?.confirmedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
