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
  BarChart2,
  ShieldAlert,
  Calendar,
  Building2,
  UserCog,
  Bell,
  History,
  ClipboardList,
  UserCircle,
} from 'lucide-react';
import { hasAdminPrivilege, isManager } from '@/lib/permissions';
import type { UserSession } from '@/types';

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
    label: '通知',
    href: '/notifications',
    icon: <Bell className="h-5 w-5" />,
    visible: () => true,
  },
  {
    label: '目標設定・評価',
    href: '/goals/new',
    icon: <Target className="h-5 w-5" />,
    visible: () => true,
  },
  {
    label: '過去の評価',
    href: '/evaluations/history',
    icon: <History className="h-5 w-5" />,
    visible: () => true,
  },
  {
    label: '目標一覧（自部署）',
    href: '/goals',
    icon: <Users className="h-5 w-5" />,
    visible: (roles) => isManager(roles) || hasAdminPrivilege(roles),
  },
  {
    label: '目標一覧（全社）',
    href: '/goals/all',
    icon: <BarChart className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
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
    label: '評価サマリ',
    href: '/reports/summary',
    icon: <BarChart2 className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
  {
    label: 'フェーズ管理(テスト用)',
    href: '/admin/phases',
    icon: <Calendar className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
  {
    label: '社員管理',
    href: '/admin/users',
    icon: <UserCog className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
  {
    label: '組織管理',
    href: '/admin/organizations',
    icon: <Building2 className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
  {
    label: '評価期管理',
    href: '/admin/periods',
    icon: <Settings className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
  {
    label: '監査ログ',
    href: '/admin/audit-logs',
    icon: <ClipboardList className="h-5 w-5" />,
    visible: (roles) => hasAdminPrivilege(roles),
  },
];

export function Sidebar({ user }: { user: UserSession | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-white min-h-screen">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-[#01AEBB]">MBO System</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <>
            {navItems
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
              })}
            {user && (
              <Link
                href={`/employees/${user.id}`}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === `/employees/${user.id}`
                    ? 'bg-[#01AEBB]/10 text-[#01AEBB]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <UserCircle className="h-5 w-5" />
                マイプロフィール
              </Link>
            )}
          </>
      </nav>

      {user && hasAdminPrivilege(user.roles) && (
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
