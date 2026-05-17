'use client';

import { Bell, LogOut, User } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotifications } from '@/hooks/useNotifications';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user, isLoading } = useCurrentUser();
  const { unreadCount } = useNotifications({ enabled: !!user, limit: 10 });
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu button could go here */}
      </div>

      <div className="flex items-center gap-6">
        <Link href="/notifications" className="relative text-gray-500 hover:text-gray-700" title="通知">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#01AEBB] px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div className="hidden flex-col md:flex">
            {!isLoading && user ? (
              <>
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-gray-500">{user.roles.join(', ')}</span>
              </>
            ) : (
              <div className="h-8 w-24 animate-pulse rounded bg-gray-200"></div>
            )}
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          title="ログアウト"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
