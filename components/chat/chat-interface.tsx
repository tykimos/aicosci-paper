'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paper } from '@/types/database';
import { ChatMessage } from './chat-message';
import { PromptButtons } from './prompt-buttons';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  papers?: Paper[];
  timestamp: Date;
}

interface ChatInterfaceProps {
  paperId: string | null;
  onSearchResults: (papers: Paper[]) => void;
  onPaperSelect: (paperId: string) => void;
  sessionId: string;
  onMessageSent?: () => void;
}

export function ChatInterface({
  paperId,
  onSearchResults,
  onPaperSelect,
  sessionId,
  onMessageSent,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isStreaming) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    onMessageSent?.();

    try {
      // Call chat API with streaming support
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          paperId,
          sessionId,
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream response
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.content) {
              assistantMessage.content += parsed.content;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
            }

            if (parsed.papers) {
              assistantMessage.papers = parsed.papers;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
              onSearchResults(parsed.papers);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '죄송합니다. 메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-80 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-40">
      <div className="h-full flex flex-col max-w-7xl mx-auto">
        {/* Messages area */}
        <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[120px]">
                <p className="text-muted-foreground text-sm font-light tracking-wide">
                  논문에 대해 궁금한 점을 물어보세요
                </p>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onPaperSelect={onPaperSelect}
              />
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-start gap-3 animate-in fade-in duration-300">
                <div className="flex-1">
                  <div className="inline-block bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Prompt buttons */}
        <div className="px-4 pb-2">
          <PromptButtons
            paperId={paperId}
            onPromptClick={handleSend}
            disabled={isStreaming}
          />
        </div>

        {/* Input area */}
        <div className="px-4 pb-4">
          <div className="relative flex items-center gap-2 group">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={paperId ? "논문에 대해 질문하세요..." : "논문을 검색하거나 질문하세요..."}
              disabled={isStreaming}
              className="pr-12 h-11 text-base rounded-full border-2 transition-all duration-200 focus-visible:ring-4 focus-visible:ring-primary/20"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow-lg transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
