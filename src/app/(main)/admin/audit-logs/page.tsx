import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { auditActionLabels, type AuditAction } from '@/lib/audit';

const PAGE_SIZE = 50;

const actionBadgeVariant: Record<AuditAction, string> = {
  GOAL_APPROVED: 'bg-[#01AEBB]/10 text-[#01AEBB]',
  GOAL_REJECTED: 'bg-red-100 text-red-700',
  GOAL_MEETING_REJECTED: 'bg-red-100 text-red-700',
  EVALUATION_CONFIRMED: 'bg-purple-100 text-purple-700',
};

async function getAuditLogs(page: number) {
  const [total, items] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        beforeValue: true,
        afterValue: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);
  return { total, items };
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const { roles } = await getActiveRoles(user.email);

  if (!hasAdminPrivilege(roles)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>アクセス権限がありません</AlertTitle>
        <AlertDescription>監査ログは HR または ADMIN のみ閲覧できます。</AlertDescription>
      </Alert>
    );
  }

  const { page: rawPage } = await searchParams;
  const page = rawPage && Number(rawPage) > 0 ? Math.floor(Number(rawPage)) : 1;

  const { total, items } = await getAuditLogs(page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">監査ログ</h2>
        <p className="text-muted-foreground">
          承認・差し戻し・評価確定などの重要操作の記録を確認できます。
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border bg-white text-gray-500">
          <ShieldCheck className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm">監査ログはまだありません</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-white">
            <div className="border-b bg-gray-50 px-4 py-2 text-xs text-gray-500">
              全 {total} 件 / {page} ページ目（{PAGE_SIZE} 件ずつ表示）
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">操作日時</th>
                  <th className="px-4 py-3 text-left font-medium">操作者</th>
                  <th className="px-4 py-3 text-left font-medium">操作種別</th>
                  <th className="px-4 py-3 text-left font-medium">対象</th>
                  <th className="px-4 py-3 text-left font-medium">変更内容</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((log) => {
                  const action = log.action as AuditAction;
                  const label = auditActionLabels[action] ?? log.action;
                  const badgeClass = actionBadgeVariant[action] ?? 'bg-gray-100 text-gray-700';
                  return (
                    <tr key={log.id} className="bg-white hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{log.actor.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">{log.targetType}</span>
                        <p className="font-mono text-xs text-gray-400">
                          {log.targetId.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <ChangeCell
                          before={log.beforeValue as Record<string, unknown> | null}
                          after={log.afterValue as Record<string, unknown> | null}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`?page=${page - 1}`}
                  className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                >
                  前へ
                </a>
              )}
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`?page=${page + 1}`}
                  className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                >
                  次へ
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChangeCell({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  if (!before && !after) return <span className="text-gray-300">—</span>;

  const beforeStatus = before?.status as string | undefined;
  const afterStatus = after?.status as string | undefined;

  if (beforeStatus || afterStatus) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {beforeStatus && (
          <Badge variant="outline" className="font-mono text-xs">
            {beforeStatus}
          </Badge>
        )}
        {beforeStatus && afterStatus && <span className="text-gray-400">→</span>}
        {afterStatus && (
          <Badge variant="outline" className="font-mono text-xs">
            {afterStatus}
          </Badge>
        )}
      </div>
    );
  }

  const afterGrade = after?.finalGrade as string | undefined;
  if (afterGrade) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500">総合評価:</span>
        <span className="font-bold text-[#01AEBB]">{afterGrade}</span>
        {after?.totalScore != null && (
          <span className="text-gray-400">（{String(after.totalScore)}点）</span>
        )}
      </div>
    );
  }

  return (
    <span className="font-mono text-xs text-gray-400">
      {JSON.stringify(after ?? before).slice(0, 60)}
    </span>
  );
}
