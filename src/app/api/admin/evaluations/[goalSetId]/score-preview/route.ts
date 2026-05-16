import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { calculateEvaluationScore } from '@/lib/score';

export async function GET(_req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roles } = await getActiveRoles(user.email);
    if (!hasAdminPrivilege(roles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      include: {
        employee: {
          include: {
            degree360Scores: true,
          },
        },
        membership: true,
        goals: {
          where: { isCurrent: true },
          include: { managerReview: true },
        },
      },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

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

    return NextResponse.json(preview);
  } catch (error) {
    console.error('Error previewing evaluation score:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
