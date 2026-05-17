'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

const notificationTypeLabels: Record<string, string> = {
  APPROVAL_REQUEST: '承認依頼',
  APPROVAL_COMPLETED: '承認完了',
  APPROVAL_PROGRESSED: '承認進行',
  APPROVAL_REJECTED: '差し戻し',
  SELF_REVIEW_SUBMITTED: '自己評価提出',
  MIDTERM_REVIEW_REQUEST: '中間振り返り',
  MEETING_REJECTED: 'すり合わせ差し戻し',
  SAVED_GOAL_REJECTED: '保存目標の修正依頼',
};

function formatCreatedAt(value: string) {
  return format(new Date(value), 'yyyy/MM/dd HH:mm', { locale: ja });
}

export function NotificationList() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        通知を取得できませんでした。時間をおいて再度お試しください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Bell className="h-4 w-4" />
          <span>未読 {unreadCount}件</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void markAllAsRead()}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4" />
          すべて既読
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border bg-white text-gray-500">
          <Inbox className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm">通知はありません</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start justify-between gap-4 border-b p-4 last:border-b-0 ${
                notification.isRead ? 'bg-white' : 'bg-[#01AEBB]/5'
              }`}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={notification.isRead ? 'outline' : 'default'}>
                    {notificationTypeLabels[notification.type] ?? notification.type}
                  </Badge>
                  {!notification.isRead && (
                    <span className="h-2 w-2 rounded-full bg-[#01AEBB]" aria-label="未読" />
                  )}
                  <time className="text-xs text-gray-500" dateTime={notification.createdAt}>
                    {formatCreatedAt(notification.createdAt)}
                  </time>
                </div>
                <p className="text-sm leading-6 text-gray-900">{notification.message}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void markAsRead(notification.id)}
                disabled={notification.isRead}
                title="既読にする"
              >
                <Check className="h-4 w-4" />
                既読
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
