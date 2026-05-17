import { NotificationList } from '@/components/notifications/NotificationList';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">通知</h1>
        <p className="mt-1 text-sm text-gray-500">
          承認依頼、差し戻し、評価提出などの通知を確認できます。
        </p>
      </div>

      <NotificationList />
    </div>
  );
}
