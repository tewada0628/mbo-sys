import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { phaseId } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: user.email },
    });

    // Check if user has ADMIN role
    if (!employee || !employee.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetPhase = await prisma.periodPhase.findUnique({
      where: { id: phaseId },
    });

    if (!targetPhase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    await prisma.$transaction(async (tx) => {
      // 1. Move all other phases in the same period away from "now"
      // This is a simplistic implementation for testing
      await tx.periodPhase.updateMany({
        where: { 
          evaluationPeriodId: targetPhase.evaluationPeriodId,
          id: { not: phaseId }
        },
        data: {
          startDate: new Date('2030-01-01'),
          endDate: new Date('2030-12-31'),
        }
      });

      // 2. Set target phase to cover "now"
      await tx.periodPhase.update({
        where: { id: phaseId },
        data: {
          startDate: yesterday,
          endDate: nextWeek,
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error switching phase:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
