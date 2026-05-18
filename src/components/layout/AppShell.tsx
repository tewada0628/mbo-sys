import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import type { UserSession } from '@/types';

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userSession: UserSession | null = null;
  if (user?.email) {
    const now = new Date();
    const employee = await prisma.employee.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          where: {
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gt: now } }],
          },
          select: { roles: true },
        },
      },
    });
    if (employee) {
      userSession = {
        id: employee.id,
        email: employee.email,
        name: employee.name,
        roles: [...new Set(employee.memberships.flatMap(m => m.roles))],
      };
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={userSession} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={userSession} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
