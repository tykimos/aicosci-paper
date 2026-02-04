'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Download,
  Settings,
  LogOut,
  Home,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/papers', label: '논문 관리', icon: FileText },
  { href: '/admin/surveys', label: '설문 결과', icon: ClipboardList },
  { href: '/admin/export', label: '데이터 다운로드', icon: Download },
  { href: '/admin/settings', label: '설정', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show layout on login page
  if (pathname === '/admin/login') {
    return children;
  }

  const handleLogout = async () => {
    await fetch('/api/v1/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-700 via-emerald-600 to-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">
              관리자
            </span>
          </Link>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              메인으로
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r bg-sidebar hidden lg:block">
          <ScrollArea className="h-[calc(100vh-3.5rem)] py-4">
            <div className="space-y-1 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent',
                      isActive && 'bg-accent'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
