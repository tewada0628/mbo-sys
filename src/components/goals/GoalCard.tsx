import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalSetStatus } from '@prisma/client';
import { Target, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface GoalCardProps {
  goalSet: {
    id: string;
    status: GoalSetStatus;
    goals: {
      id: string;
      title: string;
      weight: number;
    }[];
  } | null;
}

export function GoalCard({ goalSet }: GoalCardProps) {
  if (!goalSet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-gray-500" />
            今期の目標
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-4">目標がまだ設定されていません</p>
            <Link 
              href="/goals/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#01AEBB] px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-[#01AEBB]/90"
            >
              目標を設定する
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: GoalSetStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="bg-gray-50 text-gray-600">下書き</Badge>;
      case 'SAVED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600">保存済み（申請対象外）</Badge>;
      case 'PENDING_MANAGER':
      case 'PENDING_DIVISION':
      case 'PENDING_EXECUTIVE':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200"><Clock className="mr-1 h-3 w-3" /> 承認待ち</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200"><CheckCircle2 className="mr-1 h-3 w-3" /> 承認済み</Badge>;
      case 'REJECTED':
      case 'MEETING_REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200"><AlertCircle className="mr-1 h-3 w-3" /> 差し戻し</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-[#01AEBB]" />
            今期の目標
          </CardTitle>
          {getStatusBadge(goalSet.status)}
        </div>
      </CardHeader>
      <CardContent>
        {goalSet.goals.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {goalSet.goals.map((goal, idx) => (
                <div key={goal.id} className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex gap-2">
                    <span className="text-sm font-medium text-gray-500">目標{idx + 1}</span>
                    <span className="text-sm line-clamp-1 font-medium">{goal.title}</span>
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap bg-gray-100 text-gray-700">ウェイト {Number(goal.weight)}%</Badge>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Link
                href={`/goals/${goalSet.id}`}
                className="text-sm font-medium text-[#01AEBB] hover:underline flex items-center justify-end"
              >
                詳細を見る →
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-gray-500">
            目標項目が登録されていません
          </div>
        )}
      </CardContent>
    </Card>
  );
}
