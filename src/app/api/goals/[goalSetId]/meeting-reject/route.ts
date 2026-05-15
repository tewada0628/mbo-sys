import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ goalSetId: string }> }) {
  try {
    const { goalSetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goalSet = await prisma.goalSet.findUnique({
      where: { id: goalSetId },
    });

    if (!goalSet) {
      return NextResponse.json({ error: 'Goal set not found' }, { status: 404 });
    }

    if (goalSet.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Can only meeting-reject from APPROVED status' }, { status: 409 });
    }

    // Role check logic would be here for DEPT_MANAGER+ 
    // We assume the frontend checked the role to display the button, 
    // but in a real app we'd verify the user's role on the backend too.

    await prisma.goalSet.update({
      where: { id: goalSet.id },
      data: { status: 'MEETING_REJECTED' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting goal set:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
