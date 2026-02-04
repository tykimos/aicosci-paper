'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ClipboardList, FileText, GripVertical, Eye } from 'lucide-react';
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

  // Filter papers based on viewed status
  const filteredPapers = showViewedOnly
    ? papers.filter((p) => isViewed(p.id))
    : papers;

  return (
    <aside
      ref={sidebarRef}
      className="shrink-0 border-r bg-sidebar hidden lg:flex flex-col relative overflow-hidden"
      style={{ width: sidebarWidth }}
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

      <ScrollArea className="flex-1">
        <div className="p-4 pt-0 space-y-2">
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
                <Card
                  key={paper.id}
                  className={cn(
                    'group relative overflow-hidden cursor-pointer transition-all duration-200',
                    'border border-border/50 hover:border-border',
                    'hover:shadow-md hover:shadow-primary/5',
                    isSelected && 'bg-primary/5 border-primary/50 shadow-sm',
                    viewed && 'border-l-[3px] border-l-blue-500',
                    !isSelected && !viewed && 'hover:bg-accent/30'
                  )}
                  onClick={() => onSelectPaper(paper.id)}
                >
                  <div className="p-3 space-y-2.5">
                    {/* Header with title and status */}
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                        isSelected ? 'bg-primary/10' : 'bg-muted/50 group-hover:bg-muted'
                      )}>
                        <FileText className={cn(
                          'h-4 w-4',
                          isSelected ? 'text-primary' : viewed ? 'text-blue-500' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          'text-sm font-medium line-clamp-2 leading-snug',
                          isSelected ? 'text-foreground' : viewed ? 'text-muted-foreground' : 'text-foreground'
                        )}>
                          {paper.title}
                        </h3>
                        {paper.authors.length > 0 && (
                          <p className="text-xs text-muted-foreground/80 truncate mt-1">
                            {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 && ' ...'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags and stats */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                        {paper.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTag === tag ? 'default' : 'outline'}
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-5 shrink-0 max-w-[70px] truncate cursor-pointer transition-colors',
                              selectedTag !== tag && 'hover:bg-accent border-border/50'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(tag === selectedTag ? null : tag);
                              setShowViewedOnly(false);
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                        {viewed && (
                          <span className="flex items-center gap-0.5 text-blue-500">
                            <Eye className="h-3 w-3" />
                          </span>
                        )}
                        {surveyed && (
                          <span className="flex items-center gap-0.5 text-green-500">
                            <ClipboardList className="h-3 w-3" />
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <ClipboardList className="h-3 w-3" />
                          {paper.survey_count}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
                  )}
                </Card>
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
