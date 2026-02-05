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

// Parse paper links from text [[paper:id|title]] -> clickable link
function parsePaperLinks(
  text: string,
  onPaperClick: (paperId: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[paper:([^|]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const paperId = match[1];
    const paperTitle = match[2];

    // Add clickable paper link
    parts.push(
      <button
        key={`paper-link-${keyIndex++}`}
        onClick={(e) => {
          e.stopPropagation();
          onPaperClick(paperId);
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors text-sm font-medium cursor-pointer border border-primary/20"
      >
        <FileText className="w-3 h-3" />
        <span className="underline-offset-2 hover:underline">{paperTitle}</span>
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Process inline formatting (bold, paper links)
function processInlineFormatting(
  text: string,
  onPaperClick: (paperId: string) => void
): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  // First parse paper links
  const withPaperLinks = parsePaperLinks(text, onPaperClick);

  for (const part of withPaperLinks) {
    if (typeof part !== 'string') {
      result.push(part);
      continue;
    }

    // Process bold formatting
    let processed: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let keyIndex = 0;

    while ((match = boldRegex.exec(part)) !== null) {
      if (match.index > lastIndex) {
        processed.push(part.slice(lastIndex, match.index));
      }
      processed.push(
        <strong key={`bold-${keyIndex++}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < part.length) {
      processed.push(part.slice(lastIndex));
    }

    result.push(...(processed.length > 0 ? processed : [part]));
  }

  return result;
}

// Simple markdown-like text rendering with paper links
function FormatText({
  text,
  onPaperClick,
}: {
  text: string;
  onPaperClick: (paperId: string) => void;
}) {
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

      // Split into lines and process each
      const lines = textPart.split('\n');
      let currentParagraph: React.ReactNode[] = [];
      let paragraphKey = 0;

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`${i}-p-${paragraphKey++}`} className="leading-relaxed space-y-1">
              {currentParagraph}
            </p>
          );
          currentParagraph = [];
        }
      };

      lines.forEach((line, lIdx) => {
        const trimmedLine = line.trim();

        // Empty line - flush paragraph
        if (!trimmedLine) {
          flushParagraph();
          return;
        }

        // Horizontal rule
        if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
          flushParagraph();
          elements.push(<hr key={`${i}-hr-${lIdx}`} className="my-3 border-border" />);
          return;
        }

        // H1 header
        if (trimmedLine.startsWith('# ')) {
          flushParagraph();
          elements.push(
            <h1 key={`${i}-h1-${lIdx}`} className="text-xl font-bold mt-4 mb-2">
              {processInlineFormatting(trimmedLine.slice(2), onPaperClick)}
            </h1>
          );
          return;
        }

        // H2 header
        if (trimmedLine.startsWith('## ')) {
          flushParagraph();
          elements.push(
            <h2 key={`${i}-h2-${lIdx}`} className="text-lg font-semibold mt-4 mb-2">
              {processInlineFormatting(trimmedLine.slice(3), onPaperClick)}
            </h2>
          );
          return;
        }

        // H3 header
        if (trimmedLine.startsWith('### ')) {
          flushParagraph();
          elements.push(
            <h3 key={`${i}-h3-${lIdx}`} className="text-base font-semibold mt-3 mb-1">
              {processInlineFormatting(trimmedLine.slice(4), onPaperClick)}
            </h3>
          );
          return;
        }

        // Bullet points
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          currentParagraph.push(
            <div key={`line-${lIdx}`} className="flex gap-2 ml-4">
              <span className="text-foreground/60 select-none">•</span>
              <span>{processInlineFormatting(trimmedLine.slice(2), onPaperClick)}</span>
            </div>
          );
          return;
        }

        // Numbered lists
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          currentParagraph.push(
            <div key={`line-${lIdx}`} className="flex gap-2 ml-4">
              <span className="text-foreground/60 select-none min-w-[1.5rem]">
                {numberedMatch[1]}.
              </span>
              <span>{processInlineFormatting(numberedMatch[2], onPaperClick)}</span>
            </div>
          );
          return;
        }

        // Regular line
        currentParagraph.push(
          <div key={`line-${lIdx}`}>
            {processInlineFormatting(line, onPaperClick)}
          </div>
        );
      });

      // Flush remaining paragraph
      flushParagraph();
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

  return <>{elements}</>;
}

export function ChatMessage({ message, onPaperSelect }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Content */}
      <div className={`space-y-3 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Text message */}
        <div
          className={`inline-block rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm border border-border/50'
          }`}
        >
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="text-[15px] leading-relaxed space-y-3 prose prose-sm max-w-none dark:prose-invert">
              <FormatText text={message.content} onPaperClick={onPaperSelect} />
            </div>
          )}
        </div>

        {/* Paper recommendations (card style) */}
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
