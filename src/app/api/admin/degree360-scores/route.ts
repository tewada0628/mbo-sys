import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { EVALUATION_PHASES, getCurrentPhase, isInPhase } from '@/lib/phases';

const degree360ScoreSchema = z.object({
  evaluationPeriodId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  employeeCode: z.string().optional(),
  achievementScore: z.number().min(0).max(5),
  credoScore: z.number().min(0).max(7),
  isTop20Achievement: z.boolean().default(false),
  source: z.string().trim().min(1).max(30).optional(),
}).refine((data) => Boolean(data.employeeId || data.employeeCode), {
  message: 'employeeId または employeeCode は必須です。',
  path: ['employeeCode'],
});

export async function POST(req: Request) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const body = await req.json();
    const result = degree360ScoreSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const currentPhase = await getCurrentPhase(result.data.evaluationPeriodId);
    if (!isInPhase(currentPhase?.phaseType, [EVALUATION_PHASES.DEGREE_360, EVALUATION_PHASES.ADJUSTMENT])) {
      return NextResponse.json({ error: '360度評価または評価調整・確定フェーズ外のため登録できません。' }, { status: 403 });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(result.data.employeeId ? [{ id: result.data.employeeId }] : []),
          ...(result.data.employeeCode ? [{ employeeCode: result.data.employeeCode }] : []),
        ],
      },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const existingScore = await prisma.degree360Score.findFirst({
      where: {
        employeeId: employee.id,
        evaluationPeriodId: result.data.evaluationPeriodId,
      },
      select: { id: true },
    });

    const scoreData = {
      achievementScore: result.data.achievementScore,
      credoScore: result.data.credoScore,
      isTop20Achievement: result.data.isTop20Achievement,
      source: result.data.source ?? 'HR_INPUT',
      importedAt: new Date(),
    };

    const score = existingScore
      ? await prisma.degree360Score.update({
          where: { id: existingScore.id },
          data: scoreData,
        })
      : await prisma.degree360Score.create({
          data: {
            employeeId: employee.id,
            evaluationPeriodId: result.data.evaluationPeriodId,
            ...scoreData,
          },
        });

    return NextResponse.json({ success: true, id: score.id, updated: Boolean(existingScore) });
  } catch (error) {
    console.error('Error upserting degree360 score:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
