import { createClient } from '@/utils/supabase/server';
import { signOut } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import prisma from '@/lib/db';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null; // Should be handled by middleware
  }

  const employee = await prisma.employee.findUnique({
    where: { email: user.email! },
    include: {
      memberships: {
        include: {
          organizationSnapshot: true
        }
      }
    }
  });

  const membership = employee?.memberships[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-[#01AEBB]" />
            <span className="text-xl font-bold text-gray-900">MBO System</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{employee?.name}</p>
              <p className="text-xs text-gray-500">{membership?.organizationSnapshot.name} / {membership?.position}</p>
            </div>
            <form action={signOut}>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>ようこそ、{employee?.name} さん</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                目標管理システムへログインしました。
                現在はフェーズ3の認証機能の実装が完了した状態です。
                これから目標の設定や評価の入力機能などを順次実装していきます。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-[#01AEBB]" />
                所属情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">部署</label>
                <p className="font-medium text-gray-900">{membership?.organizationSnapshot.name || '未所属'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">役職</label>
                <p className="font-medium text-gray-900">{membership?.position || '未設定'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">役割</label>
                <p className="font-medium text-gray-900">{membership?.roles.join(', ') || 'なし'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
          &copy; 2026 NEWONE, Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
