import { Goal } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface GoalVersionHistoryProps {
  goals: Goal[];
}

export function GoalVersionHistory({ goals }: GoalVersionHistoryProps) {
  const oldGoals = goals.filter(g => !g.isCurrent).sort((a, b) => b.version - a.version);

  if (oldGoals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        変更履歴はありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {oldGoals.map((goal) => (
        <Card key={goal.id}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>バージョン {goal.version}</span>
              <span className="text-muted-foreground font-normal">
                {format(new Date(goal.updatedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <span className="font-semibold">タイトル:</span> {goal.title}
            </div>
            {goal.revisionReason && (
              <div>
                <span className="font-semibold">修正理由:</span> {goal.revisionReason}
              </div>
            )}
            {goal.revisionNote && (
              <div>
                <span className="font-semibold">修正内容:</span> {goal.revisionNote}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
