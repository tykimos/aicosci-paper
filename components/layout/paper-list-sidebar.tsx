'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, EyeOff, ClipboardCheck, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewedPapers, useCompletedSurveys } from '@/hooks/use-local-storage';
import type { Paper } from '@/types/database';

interface PaperListSidebarProps {
  selectedPaperId: string | null;
  onSelectPaper: (id: string) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 320;

export function PaperListSidebar({
  selectedPaperId,
  onSelectPaper,
}: PaperListSidebarProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  // Filter states
  const [viewFilter, setViewFilter] = useState<'all' | 'viewed' | 'unviewed' | 'surveyed' | 'unsurveyed'>('all');
  const sidebarRef = useRef<HTMLElement>(null);

  const { isViewed, markAsViewed, viewedCount } = useViewedPapers();
  const { isSurveyCompleted } = useCompletedSurveys();

  useEffect(() => {
    const fetchPapers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '200');

        const response = await fetch(`/api/v1/papers?${params}`);
        const data = await response.json();

        if (data.success) {
          setPapers(data.data.papers);
          // Extract unique tags
          const allTags = data.data.papers.flatMap((p: Paper) => p.tags || []);
          const uniqueTags = [...new Set(allTags)] as string[];
          setTags(uniqueTags.slice(0, 10));
        }
      } catch (error) {
        console.error('Error fetching papers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPapers();
  }, []);

  // Mark paper as viewed when selected
  useEffect(() => {
    if (selectedPaperId) {
      const paper = papers.find((p) => p.id === selectedPaperId);
      if (paper) {
        markAsViewed(selectedPaperId, paper.title);
      }
    }
  }, [selectedPaperId, papers, markAsViewed]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left;
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Filter papers based on viewFilter
  const filteredPapers = papers.filter((p) => {
    // Tag filter
    if (selectedTag && !(p.tags || []).includes(selectedTag)) {
      return false;
    }

    // View status filter
    const viewed = isViewed(p.id);
    const surveyed = isSurveyCompleted(p.id);

    switch (viewFilter) {
      case 'viewed':
        return viewed;
      case 'unviewed':
        return !viewed;
      case 'surveyed':
        return surveyed;
      case 'unsurveyed':
        return !surveyed;
      default:
        return true;
    }
  });

  // Count for badges
  const unviewedCount = papers.filter((p) => !isViewed(p.id)).length;
  const surveyedCount = papers.filter((p) => isSurveyCompleted(p.id)).length;
  const unsurveyedCount = papers.length - surveyedCount;

  return (
    <aside
      ref={sidebarRef}
      className="shrink-0 border-r bg-sidebar hidden lg:flex flex-col relative h-full overflow-hidden"
      style={{ width: sidebarWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
    >
      <div className="p-4 space-y-3 flex-shrink-0">
        {/* 필터 헤더 */}
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>필터</span>
        </div>

        {/* 상태 필터 */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={viewFilter === 'all' ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80 shrink-0"
            onClick={() => setViewFilter('all')}
          >
            전체 ({papers.length})
          </Badge>
          <Badge
            variant={viewFilter === 'unviewed' ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80 shrink-0 flex items-center gap-1"
            onClick={() => setViewFilter('unviewed')}
          >
            <EyeOff className="h-3 w-3" />
            읽기전 ({unviewedCount})
          </Badge>
          <Badge
            variant={viewFilter === 'viewed' ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80 shrink-0 flex items-center gap-1"
            onClick={() => setViewFilter('viewed')}
          >
            <Eye className="h-3 w-3" />
            읽음 ({viewedCount})
          </Badge>
          <Badge
            variant={viewFilter === 'unsurveyed' ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80 shrink-0 flex items-center gap-1"
            onClick={() => setViewFilter('unsurveyed')}
          >
            <ClipboardCheck className="h-3 w-3" />
            설문전 ({unsurveyedCount})
          </Badge>
          <Badge
            variant={viewFilter === 'surveyed' ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80 shrink-0 flex items-center gap-1"
            onClick={() => setViewFilter('surveyed')}
          >
            <ClipboardCheck className="h-3 w-3" />
            설문완료 ({surveyedCount})
          </Badge>
        </div>

        {/* 태그 필터 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            <Badge
              variant={selectedTag === null ? 'secondary' : 'outline'}
              className="cursor-pointer hover:bg-secondary/80 shrink-0 text-xs"
              onClick={() => setSelectedTag(null)}
            >
              전체
            </Badge>
            {tags.map((tag, idx) => {
              const pastelColors = [
                { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700', hover: 'hover:bg-rose-50 dark:hover:bg-rose-900/20' },
                { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', hover: 'hover:bg-sky-50 dark:hover:bg-sky-900/20' },
                { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
                { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20' },
                { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700', hover: 'hover:bg-violet-50 dark:hover:bg-violet-900/20' },
                { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700', hover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20' },
                { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700', hover: 'hover:bg-teal-50 dark:hover:bg-teal-900/20' },
                { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
                { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700', hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
                { bg: 'bg-lime-100 dark:bg-lime-900/40', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-300 dark:border-lime-700', hover: 'hover:bg-lime-50 dark:hover:bg-lime-900/20' },
              ];
              const color = pastelColors[idx % pastelColors.length];
              const isActive = selectedTag === tag;

              return (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    'cursor-pointer shrink-0 max-w-[120px] truncate text-xs border transition-all',
                    isActive
                      ? `${color.bg} ${color.text} ${color.border} font-medium`
                      : 'text-foreground border-border hover:bg-accent'
                  )}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                >
                  #{tag}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pt-0 space-y-2 pb-8">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : filteredPapers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {viewFilter === 'viewed' && '읽은 연구보고서가 없습니다.'}
              {viewFilter === 'unviewed' && '모든 연구보고서를 읽었습니다!'}
              {viewFilter === 'surveyed' && '설문 완료한 연구보고서가 없습니다.'}
              {viewFilter === 'unsurveyed' && '모든 연구보고서의 설문을 완료했습니다!'}
              {viewFilter === 'all' && '연구보고서가 없습니다.'}
            </p>
          ) : (
            filteredPapers.map((paper) => {
              const viewed = isViewed(paper.id);
              const surveyed = isSurveyCompleted(paper.id);
              const isSelected = selectedPaperId === paper.id;

              return (
                <div
                  key={paper.id}
                  className={cn(
                    'group p-3 cursor-pointer transition-all duration-150 rounded-lg border-2 shadow-sm overflow-hidden',
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-md'
                      : viewed
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary/50'
                  )}
                  onClick={() => onSelectPaper(paper.id)}
                >
                  {/* Title */}
                  <h3 className={cn(
                    'text-sm leading-snug line-clamp-2 break-words',
                    isSelected ? 'font-medium text-foreground' : viewed ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {paper.title}
                  </h3>

                  {/* Hashtags & Status */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {paper.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'text-[11px] cursor-pointer transition-colors',
                          selectedTag === tag
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTag(tag === selectedTag ? null : tag);
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                    {/* Status indicators */}
                    <span className="text-[10px] ml-auto flex items-center gap-1">
                      <span className={viewed ? 'text-blue-500' : 'text-muted-foreground/50'}>
                        {viewed ? '읽음' : '읽기전'}
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className={surveyed ? 'text-green-500' : 'text-muted-foreground/50'}>
                        {surveyed ? '설문완료' : '설문전'}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Resize Handle - Elongated vertical bar */}
      <div
        className={cn(
          'absolute top-0 right-0 w-3 h-full cursor-col-resize hover:bg-primary/20 transition-colors group flex items-center justify-center',
          isResizing && 'bg-primary/30'
        )}
        onMouseDown={startResizing}
      >
        {/* Elongated grab indicator */}
        <div className={cn(
          'absolute h-16 w-1.5 rounded-full transition-all',
          isResizing
            ? 'bg-primary'
            : 'bg-slate-300 group-hover:bg-primary/60'
        )} />
      </div>
    </aside>
  );
}
