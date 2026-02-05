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
  // Filter states: null = all, 'viewed' = read only, 'unviewed' = unread only, 'surveyed' = surveyed only
  const [viewFilter, setViewFilter] = useState<'all' | 'viewed' | 'unviewed' | 'surveyed'>('all');
  const sidebarRef = useRef<HTMLElement>(null);

  const { isViewed, markAsViewed, viewedCount } = useViewedPapers();
  const { isSurveyCompleted } = useCompletedSurveys();

  useEffect(() => {
    const fetchPapers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedTag) params.append('tags', selectedTag);
        params.set('limit', '100');

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
  }, [selectedTag]);

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
    const viewed = isViewed(p.id);
    const surveyed = isSurveyCompleted(p.id);

    switch (viewFilter) {
      case 'viewed':
        return viewed;
      case 'unviewed':
        return !viewed;
      case 'surveyed':
        return surveyed;
      default:
        return true;
    }
  });

  // Count for badges
  const unviewedCount = papers.filter((p) => !isViewed(p.id)).length;
  const surveyedCount = papers.filter((p) => isSurveyCompleted(p.id)).length;

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
            안읽음 ({unviewedCount})
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
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'secondary' : 'outline'}
                className="cursor-pointer hover:bg-accent shrink-0 max-w-[120px] truncate text-xs"
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              >
                #{tag}
              </Badge>
            ))}
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
              {viewFilter === 'viewed' && '읽은 논문이 없습니다.'}
              {viewFilter === 'unviewed' && '모든 논문을 읽었습니다!'}
              {viewFilter === 'surveyed' && '설문 완료한 논문이 없습니다.'}
              {viewFilter === 'all' && '논문이 없습니다.'}
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

                  {/* Hashtags */}
                  {(paper.tags.length > 0 || viewed || surveyed) && (
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
                      {(viewed || surveyed) && (
                        <span className="text-[10px] text-muted-foreground/60 ml-auto">
                          {viewed && '읽음'}
                          {viewed && surveyed && ' · '}
                          {surveyed && '설문완료'}
                        </span>
                      )}
                    </div>
                  )}
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
