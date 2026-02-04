'use client';

import { Paper } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  papers?: Paper[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  onPaperSelect: (paperId: string) => void;
}

// Clean signals and internal tags from content
function cleanContent(text: string): string {
  return text
    .replace(/<signals>[\s\S]*?<\/signals>/g, '')
    .replace(/<prompt_buttons>[\s\S]*?<\/prompt_buttons>/g, '')
    .replace(/<action_buttons>[\s\S]*?<\/action_buttons>/g, '')
    .replace(/<suggestion_buttons>[\s\S]*?<\/suggestion_buttons>/g, '')
    .trim();
}

// Simple markdown-like text rendering
function formatText(text: string) {
  // First clean any internal tags
  const cleanedText = cleanContent(text);
  // Split by code blocks first
  const parts = cleanedText.split(/```(\w+)?\n([\s\S]*?)```/g);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // Regular text - handle inline formatting
      const textPart = parts[i];
      if (!textPart) continue;

      // Split into paragraphs
      const paragraphs = textPart.split('\n\n');
      paragraphs.forEach((para, pIdx) => {
        if (!para.trim()) return;

        // Check for headers
        if (para.startsWith('## ')) {
          elements.push(
            <h2 key={`${i}-${pIdx}-h2`} className="text-lg font-semibold mt-4 mb-2">
              {para.slice(3)}
            </h2>
          );
        } else if (para.startsWith('# ')) {
          elements.push(
            <h1 key={`${i}-${pIdx}-h1`} className="text-xl font-bold mt-4 mb-2">
              {para.slice(2)}
            </h1>
          );
        } else {
          // Process inline formatting
          const lines = para.split('\n');
          const formattedLines = lines.map((line, lIdx) => {
            // Handle bullet points
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
              return (
                <div key={lIdx} className="flex gap-2 ml-4">
                  <span className="text-foreground/60 select-none">•</span>
                  <span>{line.trim().slice(2)}</span>
                </div>
              );
            }

            // Handle numbered lists
            const numberedMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
            if (numberedMatch) {
              return (
                <div key={lIdx} className="flex gap-2 ml-4">
                  <span className="text-foreground/60 select-none min-w-[1.5rem]">
                    {numberedMatch[1]}.
                  </span>
                  <span>{numberedMatch[2]}</span>
                </div>
              );
            }

            // Regular line with inline formatting
            let processed: React.ReactNode[] = [];
            let lastIndex = 0;

            // Bold **text**
            const boldRegex = /\*\*(.+?)\*\*/g;
            let match;

            while ((match = boldRegex.exec(line)) !== null) {
              if (match.index > lastIndex) {
                processed.push(line.slice(lastIndex, match.index));
              }
              processed.push(
                <strong key={`bold-${match.index}`} className="font-semibold">
                  {match[1]}
                </strong>
              );
              lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
              processed.push(line.slice(lastIndex));
            }

            return <div key={lIdx}>{processed.length > 0 ? processed : line}</div>;
          });

          elements.push(
            <p key={`${i}-${pIdx}`} className="leading-relaxed space-y-1">
              {formattedLines}
            </p>
          );
        }
      });
    } else if (i % 3 === 1) {
      // Language identifier (skip)
      continue;
    } else {
      // Code block
      const code = parts[i];
      const lang = parts[i - 1] || '';
      elements.push(
        <div key={`code-${i}`} className="my-3">
          {lang && (
            <div className="text-xs text-muted-foreground mb-1 font-mono">{lang}</div>
          )}
          <pre className="bg-muted rounded-lg p-3 overflow-x-auto">
            <code className="text-sm font-mono">{code}</code>
          </pre>
        </div>
      );
    }
  }

  return elements;
}

export function ChatMessage({ message, onPaperSelect }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isUser ? 'flex-row-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
          isUser
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-muted text-muted-foreground border border-border'
        }`}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 space-y-3 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Text message */}
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm border border-border/50'
          }`}
        >
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="text-[15px] leading-relaxed space-y-3 prose prose-sm max-w-none dark:prose-invert">
              {formatText(message.content)}
            </div>
          )}
        </div>

        {/* Paper recommendations */}
        {message.papers && message.papers.length > 0 && (
          <div className="space-y-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
            <div className="text-xs font-medium text-muted-foreground px-1 tracking-wide uppercase">
              추천 논문
            </div>
            <div className="grid gap-2">
              {message.papers.slice(0, 3).map((paper, idx) => (
                <Card
                  key={paper.id}
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${idx * 100}ms` }}
                  onClick={() => onPaperSelect(paper.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-200">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                          {paper.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="line-clamp-1">{paper.authors.slice(0, 3).join(', ')}</span>
                          {paper.authors.length > 3 && (
                            <span className="text-muted-foreground/60">+{paper.authors.length - 3}</span>
                          )}
                        </div>
                        {paper.tags && paper.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {paper.tags.slice(0, 4).map((tag, tagIdx) => (
                              <Badge
                                key={tagIdx}
                                variant="secondary"
                                className="text-xs px-2 py-0 h-5 font-normal"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {message.papers.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                {message.papers.length - 3}개 더 보기
              </Button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[10px] text-muted-foreground/60 px-1 tracking-wide ${
            isUser ? 'text-right' : ''
          }`}
        >
          {message.timestamp.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
