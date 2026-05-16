import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EvaluationAdjustmentTable } from '@/components/admin/EvaluationAdjustmentTable';

export default async function ReviewAdjustmentPage() {
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
        <AlertDescription>評価調整・確定は HR または ADMIN のみ利用できます。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">評価調整・確定</h2>
        <p className="text-muted-foreground">
          上長評価と360度評価を合算したスコアを確認し、総合評価を確定します。
        </p>
      </div>
      <EvaluationAdjustmentTable />
    </div>
  );
}
