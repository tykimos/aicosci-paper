'use client';

import Link from 'next/link';
import { Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-700 via-emerald-600 to-blue-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-bold text-xl hidden sm:inline">
            AI CoSci Paper Review
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search - Centered */}
        <div className="max-w-xl w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="논문 검색..."
              className="w-full h-10 pl-10 pr-4 rounded-full bg-muted border-0"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin Link */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/login">
            <Settings className="h-5 w-5" />
            <span className="sr-only">관리자</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
