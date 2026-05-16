import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserManagementTable } from '@/components/admin/UserManagementTable';

export default async function AdminUsersPage() {
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
        <AlertDescription>社員管理は HR または ADMIN のみ利用できます。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">社員管理</h2>
        <p className="text-muted-foreground">
          社員情報、所属、ロール、評価者を管理します。
        </p>
      </div>
      <UserManagementTable />
    </div>
  );
}
