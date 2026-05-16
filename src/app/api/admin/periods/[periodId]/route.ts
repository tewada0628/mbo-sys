import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ periodId: string }> }) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const { periodId } = await params;
    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: periodId },
      include: {
        organizationSnapshots: {
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: 'Evaluation period not found' }, { status: 404 });
    }

    const linkedGoalSetCount = await prisma.goalSet.count({
      where: {
        OR: [
          { evaluationPeriodId: periodId },
          {
            membership: {
              organizationSnapshot: {
                evaluationPeriodId: periodId,
              },
            },
          },
        ],
      },
    });

    if (linkedGoalSetCount > 0) {
      return NextResponse.json(
        { error: '目標セットが紐づいている評価期は削除できません。先に対象データを確認してください。' },
        { status: 409 },
      );
    }

    const linkedMembershipCount = period.organizationSnapshots.reduce((sum, organization) => (
      sum + organization._count.memberships
    ), 0);

    if (linkedMembershipCount > 0) {
      return NextResponse.json(
        { error: '所属履歴が紐づいている評価期は削除できません。先に社員管理で所属を移してください。' },
        { status: 409 },
      );
    }

    const organizationSnapshotIds = period.organizationSnapshots.map((organization) => organization.id);

    await prisma.$transaction(async (tx) => {
      await tx.degree360Score.deleteMany({
        where: { evaluationPeriodId: periodId },
      });

      await tx.organizationMembership.deleteMany({
        where: {
          organizationSnapshotId: { in: organizationSnapshotIds },
        },
      });

      await tx.organizationSnapshot.deleteMany({
        where: { evaluationPeriodId: periodId },
      });

      await tx.periodPhase.deleteMany({
        where: { evaluationPeriodId: periodId },
      });

      await tx.evaluationPeriod.delete({
        where: { id: periodId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting period:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
