import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { UserSession } from '@/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: user.email },
      include: {
        memberships: {
          where: {
            validFrom: { lte: new Date() },
            OR: [
              { validTo: null },
              { validTo: { gt: new Date() } }
            ]
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Collect all unique roles from active memberships
    const rolesSet = new Set<string>();
    employee.memberships.forEach(m => {
      m.roles.forEach(r => rolesSet.add(r));
    });

    const userSession: UserSession = {
      id: employee.id,
      email: employee.email,
      name: employee.name,
      roles: Array.from(rolesSet) as any[],
    };

    return NextResponse.json(userSession);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
