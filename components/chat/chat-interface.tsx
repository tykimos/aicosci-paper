'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paper } from '@/types/database';
import { ChatMessage } from './chat-message';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  papers?: Paper[];
  promptButtons?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  paperId: string | null;
  onSearchResults: (papers: Paper[]) => void;
  onPaperSelect: (paperId: string) => void;
  sessionId: string;
  onMessageSent?: () => void;
  paperReadCount?: number;
  surveyCompleteCount?: number;
}

export function ChatInterface({
  paperId,
  onSearchResults,
  onPaperSelect,
  sessionId,
  onMessageSent,
  paperReadCount = 0,
  surveyCompleteCount = 0,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [lastReadCount, setLastReadCount] = useState(paperReadCount);
  const [lastSurveyCount, setLastSurveyCount] = useState(surveyCompleteCount);
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

  // Paper read hook - encourage user when they read papers
  useEffect(() => {
    if (paperReadCount > lastReadCount && !isStreaming && messages.length > 0) {
      setLastReadCount(paperReadCount);
      // Add encouragement message for paper reading
      const encourageMessages = [
        `대단해요! 벌써 ${paperReadCount}번째 논문을 살펴보고 계시네요! 🎉`,
        `훌륭해요! 논문을 꼼꼼히 살펴보시는 모습이 인상적이에요!`,
        `와! 연구에 대한 관심이 느껴집니다! 계속 파이팅! 💪`,
      ];
      const randomMsg = encourageMessages[Math.floor(Math.random() * encourageMessages.length)];

      if (paperReadCount % 3 === 0) { // Every 3 papers
        const encourageMessage: Message = {
          id: `encourage-${Date.now()}`,
          role: 'assistant',
          content: `${randomMsg}\n\n현재까지 ${paperReadCount}개의 논문을 확인하셨어요. 설문도 함께 참여해 주시면 더욱 감사하겠습니다!`,
          timestamp: new Date(),
          promptButtons: ['설문 참여하기', '다음 논문 추천해줘'],
        };
        setMessages((prev) => [...prev, encourageMessage]);
      }
    }
  }, [paperReadCount, lastReadCount, isStreaming, messages.length]);

  // Survey complete hook - encourage user when they complete surveys
  useEffect(() => {
    if (surveyCompleteCount > lastSurveyCount && !isStreaming && messages.length > 0) {
      setLastSurveyCount(surveyCompleteCount);
      const celebrateMessage: Message = {
        id: `celebrate-${Date.now()}`,
        role: 'assistant',
        content: `정말 멋져요! 🎊 ${surveyCompleteCount}번째 설문을 완료하셨네요!\n\n여러분의 소중한 피드백이 AI 과학 연구 발전에 큰 기여가 됩니다. 진심으로 감사드립니다!`,
        timestamp: new Date(),
        promptButtons: ['다른 논문 보기', '추천 논문 알려줘'],
      };
      setMessages((prev) => [...prev, celebrateMessage]);
    }
  }, [surveyCompleteCount, lastSurveyCount, isStreaming, messages.length]);

  // Site enter hook - trigger greeting on first visit
  useEffect(() => {
    if (sessionId && !hasGreeted && messages.length === 0) {
      const triggerGreeting = async () => {
        setHasGreeted(true);
        setIsStreaming(true);

        try {
          const response = await fetch('/api/v1/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trigger: 'site_enter',
              session_id: sessionId,
              stream: true,
            }),
          });

          if (!response.ok) return;

          const reader = response.body?.getReader();
          if (!reader) return;

          const decoder = new TextDecoder();
          let assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          };
          setMessages([assistantMessage]);

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
                if (parsed.type === 'content' && parsed.data) {
                  assistantMessage.content += parsed.data;
                  setMessages([{ ...assistantMessage }]);
                }
                if (parsed.type === 'buttons' && parsed.data) {
                  assistantMessage.promptButtons = parsed.data;
                  setMessages([{ ...assistantMessage }]);
                }
                if (parsed.type === 'done' && parsed.data) {
                  assistantMessage.promptButtons = parsed.data.promptButtons;
                  assistantMessage.isStreaming = false;
                  setMessages([{ ...assistantMessage }]);
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }

          // Mark streaming complete
          assistantMessage.isStreaming = false;
          setMessages([{ ...assistantMessage }]);
        } catch (error) {
          console.error('Greeting error:', error);
        } finally {
          setIsStreaming(false);
        }
      };

      triggerGreeting();
    }
  }, [sessionId, hasGreeted, messages.length]);

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
          paper_context: paperId ? { paper_id: paperId } : undefined,
          session_id: sessionId,
          stream: true,
          history: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.content,
          })),
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
        isStreaming: true,
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

            // Handle streaming format: { type: 'content', data: string }
            if (parsed.type === 'content' && parsed.data) {
              assistantMessage.content += parsed.data;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
            // Also handle legacy format: { content: string }
            else if (parsed.content && typeof parsed.content === 'string') {
              assistantMessage.content += parsed.content;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
            }

            // Handle buttons
            if (parsed.type === 'buttons' && parsed.data) {
              assistantMessage.promptButtons = parsed.data;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
            }

            // Handle done signal with buttons
            if (parsed.type === 'done' && parsed.data) {
              assistantMessage.promptButtons = parsed.data.promptButtons;
              assistantMessage.isStreaming = false;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
            }

            // Handle paper search results
            if (parsed.papers) {
              assistantMessage.papers = parsed.papers;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
              onSearchResults(parsed.papers);
            }

            // Handle error
            if (parsed.type === 'error') {
              assistantMessage.content = parsed.data?.message || '오류가 발생했습니다.';
              assistantMessage.isStreaming = false;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }

      // Mark streaming complete
      assistantMessage.isStreaming = false;
      setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
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
    <div className="h-full flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Messages area - takes remaining space */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0 px-3 py-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <p className="text-muted-foreground text-sm font-light tracking-wide text-center">
                논문에 대해 궁금한 점을<br/>물어보세요
              </p>
            </div>
          )}
          {messages.map((message, idx) => (
            <div key={message.id}>
              <ChatMessage
                message={message}
                onPaperSelect={onPaperSelect}
              />
              {/* Prompt buttons below assistant messages */}
              {message.role === 'assistant' &&
               message.promptButtons &&
               message.promptButtons.length > 0 &&
               !message.isStreaming &&
               idx === messages.length - 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.promptButtons.map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(btn)}
                      disabled={isStreaming}
                      className="px-3 py-1.5 text-xs border border-slate-200 bg-white text-slate-600 rounded-full hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm disabled:opacity-50"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-start gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100">
                <div
                  className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <span className="text-xs text-slate-500">생각 중...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom area - fixed at bottom */}
      <div className="flex-shrink-0 border-t bg-background/80 backdrop-blur px-3 py-3">
        <div className="relative flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={paperId ? "질문하세요..." : "검색 또는 질문..."}
            disabled={isStreaming}
            className="pr-10 h-10 text-sm rounded-full border-2 transition-all duration-200 focus-visible:ring-4 focus-visible:ring-primary/20 bg-white dark:bg-slate-900"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-lg transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
