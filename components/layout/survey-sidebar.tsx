'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, ThumbsDown, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SurveySidebarProps {
  paperId: string;
}

export function SurveySidebar({ paperId }: SurveySidebarProps) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [voteCount, setVoteCount] = useState(42);

  const handleVote = (type: 'up' | 'down') => {
    if (vote === type) {
      // 투표 취소
      setVote(null);
      setVoteCount(type === 'up' ? voteCount - 1 : voteCount + 1);
    } else {
      // 새 투표 또는 변경
      if (vote) {
        // 기존 투표 변경
        setVoteCount(type === 'up' ? voteCount + 2 : voteCount - 2);
      } else {
        // 새 투표
        setVoteCount(type === 'up' ? voteCount + 1 : voteCount - 1);
      }
      setVote(type);
    }
  };

  return (
    <aside className="w-80 shrink-0 border-l bg-sidebar hidden xl:block">
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="p-4 space-y-4">
          {/* 투표 섹션 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">투표</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={vote === 'up' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => handleVote('up')}
                  className={cn(
                    vote === 'up' && 'bg-green-600 hover:bg-green-700'
                  )}
                >
                  <ThumbsUp className="h-5 w-5" />
                </Button>
                <span className="text-2xl font-bold min-w-[3rem] text-center">
                  {voteCount}
                </span>
                <Button
                  variant={vote === 'down' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => handleVote('down')}
                  className={cn(
                    vote === 'down' && 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  <ThumbsDown className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 설문 섹션 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                설문
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 질문 1 */}
              <div className="space-y-2">
                <Label className="text-sm">Q1. 논문의 신뢰성은 어떻습니까?</Label>
                <div className="space-y-1">
                  {['매우 높음', '높음', '보통', '낮음'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                    >
                      <input type="radio" name="q1" className="accent-primary" />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {/* 질문 2 */}
              <div className="space-y-2">
                <Label className="text-sm">Q2. 연구 방법론은 적절합니까?</Label>
                <div className="space-y-1">
                  {['매우 적절', '적절', '보통', '부적절'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                    >
                      <input type="radio" name="q2" className="accent-primary" />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {/* 질문 3 */}
              <div className="space-y-2">
                <Label className="text-sm">Q3. 연구 결과의 실용성은?</Label>
                <div className="space-y-1">
                  {['매우 높음', '높음', '보통', '낮음'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                    >
                      <input type="radio" name="q3" className="accent-primary" />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              <Button className="w-full">설문 제출</Button>
            </CardContent>
          </Card>

          {/* 통계 */}
          <div className="text-xs text-muted-foreground text-center">
            총 15명이 설문에 참여했습니다
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
