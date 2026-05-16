import prisma from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { PhaseSwitcherButton } from './PhaseSwitcherButton';

const PHASE_LABELS: Record<string, string> = {
  GOAL_SETTING: '目標設定',
  MIDTERM: '中間振り返り',
  DEGREE_360: '360度評価',
  SELF_REVIEW: '自己評価',
  MANAGER_REVIEW: '上長評価',
  ADJUSTMENT: '評価調整・確定',
};

export default async function AdminPhasesPage() {
  const periods = await prisma.evaluationPeriod.findMany({
    where: {
      goalSets: { some: {} } // Only show periods that are actually being used
    },
    include: {
      phases: {
        orderBy: { startDate: 'asc' }
      }
    }
  });

  const now = new Date();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">フェーズ管理（テスト用）</h2>
        <p className="text-muted-foreground">
          テスト用に現在のフェーズを強制的に切り替えることができます。
          「有効化」ボタンを押すと、そのフェーズの期間が「現在」を含むように調整されます。
        </p>
      </div>

      {periods.map((period) => (
        <Card key={period.id}>
          <CardHeader>
            <CardTitle>{period.name}</CardTitle>
            <CardDescription>
              {format(period.startDate, 'yyyy/MM/dd', { locale: ja })} 〜 {format(period.endDate, 'yyyy/MM/dd', { locale: ja })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {period.phases.map((phase) => {
                const isActive = phase.startDate <= now && phase.endDate >= now;
                return (
                  <div key={phase.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{PHASE_LABELS[phase.phaseType] || phase.phaseType}</span>
                        {isActive && <Badge className="bg-[#01AEBB]">現在有効</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(phase.startDate, 'yyyy/MM/dd', { locale: ja })} 〜 {format(phase.endDate, 'yyyy/MM/dd', { locale: ja })}
                      </p>
                    </div>
                    {!isActive && (
                      <PhaseSwitcherButton phaseId={phase.id} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
