'use client';

import useSWR, { useSWRConfig } from 'swr';

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  unreadCount: number;
  items: NotificationItem[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json() as Promise<NotificationsResponse>;
};

type UseNotificationsOptions = {
  enabled?: boolean;
  limit?: number;
  refreshInterval?: number;
};

export function useNotifications({
  enabled = true,
  limit,
  refreshInterval = 30000,
}: UseNotificationsOptions = {}) {
  const key = enabled ? `/api/notifications${limit ? `?limit=${limit}` : ''}` : null;
  const { mutate: mutateGlobal } = useSWRConfig();
  const swr = useSWR<NotificationsResponse>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  const revalidateNotificationCaches = async () => {
    await mutateGlobal(
      (cacheKey) => typeof cacheKey === 'string' && cacheKey.startsWith('/api/notifications'),
      undefined,
      { revalidate: true },
    );
  };

  const markAsRead = async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    await revalidateNotificationCaches();
  };

  const markAllAsRead = async () => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }

    await revalidateNotificationCaches();
  };

  return {
    ...swr,
    notifications: swr.data?.items ?? [],
    unreadCount: swr.data?.unreadCount ?? 0,
    markAsRead,
    markAllAsRead,
  };
}
