import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';

async function getCurrentEmployee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const employee = await prisma.employee.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  if (!employee) {
    return { error: NextResponse.json({ error: 'Employee not found' }, { status: 404 }) };
  }

  return { employee };
}

export async function GET(req: Request) {
  try {
    const { employee, error } = await getCurrentEmployee();
    if (error) {
      return error;
    }
    const url = new URL(req.url);
    const requestedLimit = Number(url.searchParams.get('limit') ?? 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 10;

    const [unreadCount, items] = await Promise.all([
      prisma.notification.count({
        where: {
          employeeId: employee.id,
          isRead: false,
        },
      }),
      prisma.notification.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          message: true,
          isRead: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      unreadCount,
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const { employee, error } = await getCurrentEmployee();
    if (error) {
      return error;
    }

    const result = await prisma.notification.updateMany({
      where: {
        employeeId: employee.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
