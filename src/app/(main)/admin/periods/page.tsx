import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PeriodForm } from '@/components/admin/PeriodForm';

export default async function AdminPeriodsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const { roles } = await getActiveRoles(user.email);

  if (!hasAdminPrivilege(roles)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>アクセス権限がありません</AlertTitle>
        <AlertDescription>評価期管理は HR または ADMIN のみ利用できます。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">評価期管理</h2>
        <p className="text-muted-foreground">
          評価期と各フェーズの期間を管理します。
        </p>
      </div>
      <PeriodForm />
    </div>
  );
}
