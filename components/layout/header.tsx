'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, FileText, ClipboardList, MessageSquare, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BadgeDefinition } from '@/hooks/use-badges';

interface HeaderProps {
  stats?: {
    today: {
      paperViews: number;
      surveys: number;
      chats: number;
    };
    cumulative: {
      totalPaperViews: number;
      totalSurveys: number;
      totalVisits: number;
      totalChats: number;
    };
  };
  badges?: {
    earned: BadgeDefinition[];
    unearned: BadgeDefinition[];
    newBadge: BadgeDefinition | null;
    totalEarned: number;
    totalBadges: number;
  };
}

export function Header({ stats, badges }: HeaderProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleAdminClick = () => {
    setIsNavigating(true);
    router.push('/admin/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="AI-CO-SCI" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
          <span className="font-bold text-xl hidden sm:inline">
            AI-CO-SCI
          </span>
        </Link>

        {/* Challenge link - desktop inline */}
        <div className="hidden md:inline-flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">관련 대회:</span>
          <a
            href="https://aifactory.space/task/9235/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r from-emerald-600 via-blue-500 to-purple-500 hover:from-emerald-500 hover:via-blue-400 hover:to-purple-400 transition-all shadow-sm truncate max-w-[480px]"
          >
            [Track 1] 2026 AI Co-Scientist Challenge Korea (AI 연구동료 경진대회)
          </a>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Statistics */}
        {stats && (
          <TooltipProvider>
            <div className="flex items-center gap-3 text-sm">
              {/* Today's Stats */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                <span className="text-xs text-muted-foreground hidden md:inline">오늘</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {stats.today.paperViews}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>오늘 본 연구보고서</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5 text-green-500" />
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {stats.today.surveys}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>오늘 설문</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {stats.today.chats}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>오늘 채팅</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border hidden lg:block" />

              {/* Cumulative Stats */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
                <span className="text-xs text-muted-foreground">누적</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-blue-500/70" />
                      <span className="text-xs text-muted-foreground">
                        {stats.cumulative.totalPaperViews}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>누적 연구보고서 조회</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5 text-green-500/70" />
                      <span className="text-xs text-muted-foreground">
                        {stats.cumulative.totalSurveys}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>누적 설문</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-500/70" />
                      <span className="text-xs text-muted-foreground">
                        {stats.cumulative.totalChats}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>누적 채팅</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Badges */}
              {badges && (
                <>
                  <div className="h-6 w-px bg-border hidden md:block" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 cursor-default">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        <div className="flex items-center gap-0.5">
                          {badges.earned.slice(-4).map((b) => (
                            <span key={b.id} className="text-sm" title={b.name}>
                              {b.icon}
                            </span>
                          ))}
                          {badges.totalEarned === 0 && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          {badges.totalEarned}/{badges.totalBadges}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1.5">
                        <p className="font-medium text-sm">배지 ({badges.totalEarned}/{badges.totalBadges})</p>
                        {badges.earned.map((b) => (
                          <div key={b.id} className="flex items-center gap-2 text-sm">
                            <span>{b.icon}</span>
                            <span className="font-medium">{b.name}</span>
                            <span className="text-muted-foreground text-xs">{b.description}</span>
                          </div>
                        ))}
                        {badges.unearned.length > 0 && (
                          <>
                            <div className="border-t my-1" />
                            {badges.unearned.map((b) => (
                              <div key={b.id} className="flex items-center gap-2 text-sm opacity-40">
                                <span>🔒</span>
                                <span>{b.name}</span>
                                <span className="text-muted-foreground text-xs">{b.description}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin Link */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAdminClick}
          disabled={isNavigating}
        >
          {isNavigating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Settings className="h-5 w-5" />
          )}
          <span className="sr-only">관리자</span>
        </Button>
      </div>

      {/* 2nd row: Challenge link - mobile only */}
      <div className="flex md:hidden items-center justify-center gap-2 px-4 py-1.5 border-t bg-muted/30">
        <span className="text-xs text-muted-foreground whitespace-nowrap">관련 대회:</span>
        <a
          href="https://aifactory.space/task/9235/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r from-emerald-600 via-blue-500 to-purple-500 hover:from-emerald-500 hover:via-blue-400 hover:to-purple-400 transition-all shadow-sm truncate"
        >
          [Track 1] 2026 AI Co-Scientist Challenge Korea (AI 연구동료 경진대회)
        </a>
      </div>

      {/* New Badge Notification */}
      {badges?.newBadge && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
            <span className="text-lg">{badges.newBadge.icon}</span>
            <span>새 배지 획득: {badges.newBadge.name}!</span>
          </div>
        </div>
      )}
    </header>
  );
}
