import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { goalSetSchema } from '@/lib/validations/goal';

export async function PATCH(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
      include: { goals: true }
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    const editableStatuses = ['DRAFT', 'REJECTED', 'MEETING_REJECTED'];
    if (!editableStatuses.includes(goalSet.status)) {
      return NextResponse.json({ error: 'Cannot edit goals in current status' }, { status: 409 });
    }

    const body = await req.json();
    const result = goalSetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    // Since it's a draft update, we just overwrite the current goals. 
    // If it was a revision, we would do the version bumping.
    await prisma.$transaction(async (tx) => {
      // Delete existing current goals
      await tx.goal.deleteMany({
        where: { goalSetId: goalSet.id, isCurrent: true }
      });

      // Insert new ones
      await tx.goal.createMany({
        data: result.data.goals.map(g => ({
          goalSetId: goalSet.id,
          title: g.title,
          description: g.description,
          goalType: g.goalType,
          kpiPattern: g.kpiPattern,
          criteria12: g.criteria12,
          criteria10: g.criteria10,
          criteria08: g.criteria08,
          weight: g.weight,
          visibility: g.visibility,
          isCurrent: true,
          version: 1
        }))
      });
      
      // Update goal set updatedAt
      await tx.goalSet.update({
        where: { id: goalSet.id },
        data: { updatedAt: new Date() }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating goal set:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
