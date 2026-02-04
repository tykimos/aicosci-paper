'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ThumbsUp, ClipboardList, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaperListSidebarProps {
  selectedPaperId: string | null;
  onSelectPaper: (id: string) => void;
}

// 임시 더미 데이터
const dummyPapers = [
  {
    id: '1',
    title: 'AI 기반 과학적 발견의 새로운 패러다임',
    authors: ['김철수', '이영희'],
    tags: ['AI', '과학'],
    vote_count: 42,
    survey_count: 15,
    file_type: 'pdf' as const,
  },
  {
    id: '2',
    title: '딥러닝을 활용한 신약 개발 가속화',
    authors: ['박민수'],
    tags: ['딥러닝', '제약'],
    vote_count: 38,
    survey_count: 12,
    file_type: 'docx' as const,
  },
  {
    id: '3',
    title: '기후 변화 예측을 위한 머신러닝 모델',
    authors: ['정수연', '최동욱'],
    tags: ['ML', '기후'],
    vote_count: 25,
    survey_count: 8,
    file_type: 'pdf' as const,
  },
];

export function PaperListSidebar({
  selectedPaperId,
  onSelectPaper,
}: PaperListSidebarProps) {
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
          />
        </div>

        {/* 태그 필터 */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            전체
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
            AI
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
            딥러닝
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
            ML
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-3.5rem-8rem)]">
        <div className="p-4 pt-0 space-y-2">
          {dummyPapers.map((paper) => (
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
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
