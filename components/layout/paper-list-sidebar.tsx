'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ThumbsUp, ClipboardList, FileText, GripVertical, Eye } from 'lucide-react';
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
      className="shrink-0 border-r bg-sidebar hidden lg:flex flex-col relative"
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

              return (
                <Card
                  key={paper.id}
                  className={cn(
                    'p-3 cursor-pointer transition-colors hover:bg-accent/50 overflow-hidden relative',
                    selectedPaperId === paper.id && 'bg-accent border-primary',
                    viewed && 'border-l-2 border-l-blue-500'
                  )}
                  onClick={() => onSelectPaper(paper.id)}
                >
                  {/* Viewed indicator */}
                  {viewed && (
                    <div className="absolute top-2 right-2">
                      <Eye className="h-3 w-3 text-blue-500" />
                    </div>
                  )}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start gap-2 min-w-0 pr-4">
                      <FileText className={cn(
                        'h-4 w-4 mt-0.5 shrink-0',
                        viewed ? 'text-blue-500' : 'text-muted-foreground'
                      )} />
                      <h3 className={cn(
                        'text-sm font-medium line-clamp-2 leading-tight break-words min-w-0',
                        viewed && 'text-muted-foreground'
                      )}>
                        {paper.title}
                      </h3>
                    </div>
                    {paper.authors.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {paper.authors.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex gap-1 min-w-0 overflow-hidden flex-1">
                        {paper.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTag === tag ? 'default' : 'secondary'}
                            className="text-xs px-1.5 py-0 shrink-0 max-w-[80px] truncate cursor-pointer hover:bg-accent transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(tag === selectedTag ? null : tag);
                              setShowViewedOnly(false);
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                        {surveyed && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0 text-green-600 border-green-600">
                            설문완료
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-0.5">
                          <ThumbsUp className="h-3 w-3" />
                          {paper.vote_count}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <ClipboardList className="h-3 w-3" />
                          {paper.survey_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Resize Handle */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors group',
          isResizing && 'bg-primary/30'
        )}
        onMouseDown={startResizing}
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
