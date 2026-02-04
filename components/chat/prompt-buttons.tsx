'use client';

import { Button } from '@/components/ui/button';
import { Search, FileText, Sparkles, BookOpen } from 'lucide-react';

interface PromptButtonsProps {
  paperId: string | null;
  onPromptClick: (prompt: string) => void;
  disabled?: boolean;
}

interface PromptButton {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  color: string;
}

export function PromptButtons({ paperId, onPromptClick, disabled }: PromptButtonsProps) {
  const generalPrompts: PromptButton[] = [
    {
      label: '논문 검색',
      prompt: 'AI와 인지과학 관련 최신 논문을 추천해주세요',
      icon: <Search className="w-4 h-4" />,
      color: 'hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-800',
    },
    {
      label: '인기 논문',
      prompt: '가장 많이 조회된 인기 논문을 보여주세요',
      icon: <Sparkles className="w-4 h-4" />,
      color: 'hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-200 dark:hover:border-amber-800',
    },
    {
      label: '주제별 탐색',
      prompt: '주요 연구 주제별로 논문을 분류해서 보여주세요',
      icon: <BookOpen className="w-4 h-4" />,
      color: 'hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-800',
    },
  ];

  const paperSpecificPrompts: PromptButton[] = [
    {
      label: '요약 보기',
      prompt: '이 논문의 핵심 내용을 요약해주세요',
      icon: <FileText className="w-4 h-4" />,
      color: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800',
    },
    {
      label: '주요 발견',
      prompt: '이 논문의 주요 발견사항과 기여는 무엇인가요?',
      icon: <Sparkles className="w-4 h-4" />,
      color: 'hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-800',
    },
    {
      label: '관련 논문',
      prompt: '이 논문과 관련된 다른 논문을 추천해주세요',
      icon: <Search className="w-4 h-4" />,
      color: 'hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-200 dark:hover:border-violet-800',
    },
  ];

  const prompts = paperId ? paperSpecificPrompts : generalPrompts;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {prompts.map((button, index) => (
        <Button
          key={button.label}
          variant="outline"
          size="sm"
          onClick={() => onPromptClick(button.prompt)}
          disabled={disabled}
          className={`
            flex-shrink-0 gap-2 h-9 px-4 rounded-full font-medium text-xs
            border-2 transition-all duration-300
            hover:shadow-md hover:scale-105 active:scale-95
            disabled:hover:scale-100 disabled:opacity-50
            animate-in fade-in slide-in-from-bottom-2
            ${button.color}
          `}
          style={{
            animationDelay: `${index * 50}ms`,
            animationDuration: '400ms',
          }}
        >
          <span className="transition-transform duration-200 group-hover:rotate-12">
            {button.icon}
          </span>
          <span className="whitespace-nowrap">{button.label}</span>
        </Button>
      ))}

      {/* Fade edge indicator */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
