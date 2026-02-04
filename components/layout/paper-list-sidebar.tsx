'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, GripVertical, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewedPapers, useCompletedSurveys } from '@/hooks/use-local-storage';
import type { Paper } from '@/types/database';

interface PaperListSidebarProps {
  selectedPaperId: string | null;
  onSelectPaper: (id: string) => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 320;

export function PaperListSidebar({
  selectedPaperId,
  onSelectPaper,
}: PaperListSidebarProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [showViewedOnly, setShowViewedOnly] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const { isViewed, markAsViewed, viewedCount } = useViewedPapers();
  const { isSurveyCompleted } = useCompletedSurveys();

  useEffect(() => {
    const fetchPapers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
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

    const debounce = setTimeout(fetchPapers, 300);
    return () => clearTimeout(debounce);
  }, [search, selectedTag]);

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

  // Filter and sort papers - viewed papers go to bottom
  const filteredPapers = showViewedOnly
    ? papers.filter((p) => isViewed(p.id))
    : [...papers].sort((a, b) => {
        const aViewed = isViewed(a.id);
        const bViewed = isViewed(b.id);
        if (aViewed && !bViewed) return 1; // a goes to bottom
        if (!aViewed && bViewed) return -1; // b goes to bottom
        return 0; // maintain original order
      });

  return (
    <aside
      ref={sidebarRef}
      className="shrink-0 border-r bg-sidebar hidden lg:flex flex-col relative h-full"
      style={{ width: sidebarWidth, maxHeight: '100vh' }}
    >
      <div className="p-4 space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="필터..."
            className="pl-9 h-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 태그 필터 */}
        <div className="flex flex-wrap gap-1 overflow-hidden">
          <Badge
            variant={selectedTag === null && !showViewedOnly ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80 shrink-0"
            onClick={() => {
              setSelectedTag(null);
              setShowViewedOnly(false);
            }}
          >
            전체
          </Badge>
          <Badge
            variant={showViewedOnly ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80 shrink-0 flex items-center gap-1"
            onClick={() => {
              setShowViewedOnly(!showViewedOnly);
              if (!showViewedOnly) setSelectedTag(null);
            }}
          >
            <Eye className="h-3 w-3" />
            읽음 ({viewedCount})
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? 'secondary' : 'outline'}
              className="cursor-pointer hover:bg-accent shrink-0 max-w-[120px] truncate"
              onClick={() => {
                setSelectedTag(tag === selectedTag ? null : tag);
                setShowViewedOnly(false);
              }}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 pt-0 space-y-2 pb-8">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : filteredPapers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {showViewedOnly ? '읽은 논문이 없습니다.' : '논문이 없습니다.'}
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
                    'group p-3 cursor-pointer transition-all duration-150 rounded-lg border-2 shadow-sm',
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
                    'text-sm leading-snug line-clamp-2',
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
                            setShowViewedOnly(false);
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
      </ScrollArea>

      {/* Resize Handle - Thicker like chat resize bar */}
      <div
        className={cn(
          'absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-primary/10 transition-colors group flex items-center justify-center',
          isResizing && 'bg-primary/20'
        )}
        onMouseDown={startResizing}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </aside>
  );
}
