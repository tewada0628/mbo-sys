import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { EVALUATION_PHASES, getActiveRoles, getCurrentPhase, isInPhase } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { calculateEvaluationScore } from '@/lib/score';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { z } from 'zod';

const evaluationUpdateSchema = z.object({
  finalGrade: z.enum(['S', 'A', 'B', 'C', 'D']),
  adjustmentNote: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee, roles } = await getActiveRoles(user.email);
    if (!employee || !hasAdminPrivilege(roles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const result = evaluationUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
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
        finalEvaluation: { select: { finalGrade: true } },
      },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    const currentPhase = await getCurrentPhase(goalSet.evaluationPeriodId);
    if (!isInPhase(currentPhase?.phaseType, [EVALUATION_PHASES.ADJUSTMENT])) {
      return NextResponse.json({ error: '評価調整・確定フェーズ外のため確定できません。' }, { status: 403 });
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

    if (preview.mboScore == null || preview.totalScore == null) {
      return NextResponse.json({ error: '上長評価が完了していないため確定できません。' }, { status: 409 });
    }

    const finalEvaluation = await prisma.finalEvaluation.upsert({
      where: { goalSetId: goalSet.id },
      update: {
        mboScore: preview.mboScore,
        degree360AchievementBonus: preview.degree360AchievementBonus,
        degree360CredoBonus: preview.degree360CredoBonus,
        totalScore: preview.totalScore,
        finalGrade: result.data.finalGrade,
        adjustmentNote: result.data.adjustmentNote,
        confirmedBy: employee.id,
        confirmedAt: new Date(),
      },
      create: {
        goalSetId: goalSet.id,
        mboScore: preview.mboScore,
        degree360AchievementBonus: preview.degree360AchievementBonus,
        degree360CredoBonus: preview.degree360CredoBonus,
        totalScore: preview.totalScore,
        finalGrade: result.data.finalGrade,
        adjustmentNote: result.data.adjustmentNote,
        confirmedBy: employee.id,
        confirmedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: employee.id,
      action: AUDIT_ACTIONS.EVALUATION_CONFIRMED,
      targetType: 'GOAL_SET',
      targetId: goalSet.id,
      beforeValue: { finalGrade: goalSet.finalEvaluation?.finalGrade ?? null },
      afterValue: {
        finalGrade: result.data.finalGrade,
        totalScore: Number(preview.totalScore),
        mboScore: Number(preview.mboScore),
      },
    });

    return NextResponse.json({
      success: true,
      finalEvaluation: {
        id: finalEvaluation.id,
        finalGrade: finalEvaluation.finalGrade,
        adjustmentNote: finalEvaluation.adjustmentNote,
        confirmedAt: finalEvaluation.confirmedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Error updating final evaluation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
