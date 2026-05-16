import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { periodPhasesUpdateSchema } from '@/lib/validations/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ periodId: string }> }) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const { periodId } = await params;
    const body = await req.json();
    const result = periodPhasesUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: periodId },
      include: { phases: true },
    });

    if (!period) {
      return NextResponse.json({ error: 'Evaluation period not found' }, { status: 404 });
    }

    const invalidPhase = result.data.phases.find((phase) => phase.endDate < phase.startDate);
    if (invalidPhase) {
      return NextResponse.json({ error: 'フェーズの終了日は開始日以降にしてください。' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluationPeriod.update({
        where: { id: periodId },
        data: {
          name: result.data.name,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          status: result.data.status,
        },
      });

      for (const phase of result.data.phases) {
        const existingPhase = phase.id
          ? period.phases.find((item) => item.id === phase.id)
          : period.phases.find((item) => item.phaseType === phase.phaseType);

        if (existingPhase) {
          await tx.periodPhase.update({
            where: { id: existingPhase.id },
            data: {
              phaseType: phase.phaseType,
              startDate: phase.startDate,
              endDate: phase.endDate,
            },
          });
        } else {
          await tx.periodPhase.create({
            data: {
              evaluationPeriodId: periodId,
              phaseType: phase.phaseType,
              startDate: phase.startDate,
              endDate: phase.endDate,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating period phases:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
