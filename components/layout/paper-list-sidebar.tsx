'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ThumbsUp, ClipboardList, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Paper } from '@/types/database';

interface PaperListSidebarProps {
  selectedPaperId: string | null;
  onSelectPaper: (id: string) => void;
}

export function PaperListSidebar({
  selectedPaperId,
  onSelectPaper,
}: PaperListSidebarProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

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

  return (
    <aside className="w-72 shrink-0 border-r bg-sidebar hidden lg:block">
      <div className="p-4 space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="필터..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 태그 필터 */}
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={selectedTag === null ? 'secondary' : 'outline'}
            className="cursor-pointer hover:bg-secondary/80"
            onClick={() => setSelectedTag(null)}
          >
            전체
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? 'secondary' : 'outline'}
              className="cursor-pointer hover:bg-accent"
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-3.5rem-8rem)]">
        <div className="p-4 pt-0 space-y-2">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : papers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              논문이 없습니다.
            </p>
          ) : (
            papers.map((paper) => (
            <Card
              key={paper.id}
              className={cn(
                'p-3 cursor-pointer transition-colors hover:bg-accent/50',
                selectedPaperId === paper.id && 'bg-accent border-primary'
              )}
              onClick={() => onSelectPaper(paper.id)}
            >
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <h3 className="text-sm font-medium line-clamp-2 leading-tight">
                    {paper.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {paper.authors.join(', ')}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {paper.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
