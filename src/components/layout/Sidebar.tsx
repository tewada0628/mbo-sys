'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role } from '@prisma/client';
import { 
  LayoutDashboard, 
  Target, 
  Users, 
  CheckSquare, 
  Settings, 
  BarChart, 
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { hasAdminPrivilege, isManager } from '@/lib/permissions';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  visible: (roles: Role[]) => boolean;
};

const navItems: NavItem[] = [
  {
    label: 'ダッシュボード',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    visible: () => true, // Everyone sees this
  },
  {
    label: '目標設定・評価',
    href: '/goals/new',
    icon: <Target className="h-5 w-5" />,
    visible: () => true,
  },
  {
    label: '目標一覧（自部署）',
    href: '/goals',
    icon: <Users className="h-5 w-5" />,
    visible: (roles) => isManager(roles) || hasAdminPrivilege(roles),
  },
  {
    label: '承認・申請管理',
    href: '/approvals',
    icon: <CheckSquare className="h-5 w-5" />,
    visible: (roles) => isManager(roles) || hasAdminPrivilege(roles),
  },
  {
    label: '評価調整・確定',
    href: '/admin/review-adjustment',
    icon: <BarChart className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
  {
    label: 'フェーズ管理(テスト用)',
    href: '/admin/phases',
    icon: <Calendar className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
  {
    label: 'システム管理',
    href: '/admin/users',
    icon: <Settings className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();

  return (
    <aside className="flex w-64 flex-col border-r bg-white min-h-screen">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-[#01AEBB]">MBO System</h1>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : (
          navItems
            .filter((item) => item.visible(user?.roles || []))
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#01AEBB]/10 text-[#01AEBB]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })
        )}
      </nav>
      
      {!isLoading && user && hasAdminPrivilege(user.roles) && (
        <div className="border-t p-4">
          <div className="rounded-md bg-amber-50 p-3 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">管理者モード</h4>
              <p className="text-xs text-amber-700 mt-1">
                現在、全データへのアクセス権限があります。
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
