'use client';

import Link from 'next/link';
import { Settings, FileText, ClipboardList, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
}

export function Header({ stats }: HeaderProps) {
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
                    <p>오늘 본 논문</p>
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
                    <p>누적 논문 조회</p>
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
                      <Users className="h-3.5 w-3.5 text-orange-500/70" />
                      <span className="text-xs text-muted-foreground">
                        {stats.cumulative.totalVisits}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>누적 방문</p>
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
            </div>
          </TooltipProvider>
        )}

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
