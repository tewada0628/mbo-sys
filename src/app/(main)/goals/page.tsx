import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GoalSetStatus } from '@prisma/client';

const STATUS_LABELS: Record<GoalSetStatus, string> = {
  DRAFT: '下書き',
  SAVED: '保存済み',
  PENDING_MANAGER: '上長承認待ち',
  PENDING_DIVISION: '事業部長承認待ち',
  PENDING_EXECUTIVE: '役員承認待ち',
  APPROVED: '承認完了',
  REJECTED: '差し戻し',
  MEETING_REJECTED: '会議差し戻し',
};

const STATUS_COLORS: Record<GoalSetStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SAVED: 'bg-gray-100 text-gray-800',
  PENDING_MANAGER: 'bg-amber-100 text-amber-800',
  PENDING_DIVISION: 'bg-amber-100 text-amber-800',
  PENDING_EXECUTIVE: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  MEETING_REJECTED: 'bg-red-100 text-red-800',
};

export default async function SubordinateGoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentEmployee = await prisma.employee.findUnique({
    where: { email: user.email },
    include: {
      memberships: {
        where: { validTo: null }
      }
    }
  });

  if (!currentEmployee) {
    redirect('/login');
  }

  // Get goal sets where current user is the manager, division manager, or executive
  const subordinateGoalSets = await prisma.goalSet.findMany({
    where: {
      membership: {
        OR: [
          { managerId: currentEmployee.id },
          { divisionManagerId: currentEmployee.id },
          { executiveId: currentEmployee.id },
        ]
      },
      isActive: true
    },
    include: {
      employee: true,
      evaluationPeriod: true,
    },
    orderBy: {
      employee: {
        name: 'asc'
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">部下の目標一覧</h2>
        <p className="text-muted-foreground">承認・評価を担当する部下の一覧です。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subordinateGoalSets.length === 0 ? (
          <p className="col-span-full text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
            担当する部下の目標セットが見つかりませんでした。
          </p>
        ) : (
          subordinateGoalSets.map((gs) => (
            <Card key={gs.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">{gs.employee.name}</CardTitle>
                  <Badge className={STATUS_COLORS[gs.status]}>
                    {STATUS_LABELS[gs.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{gs.evaluationPeriod.name}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap justify-end gap-2 pt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/goals/${gs.id}`}>詳細を表示</Link>
                  </Button>
                  {gs.status === 'APPROVED' && (
                    <Button asChild size="sm">
                      <Link href={`/goals/${gs.id}/manager-review`}>上長評価</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
