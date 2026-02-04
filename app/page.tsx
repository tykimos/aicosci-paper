'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from '@/components/layout/header';
import { PaperListSidebar } from '@/components/layout/paper-list-sidebar';
import { PaperViewer } from '@/components/papers/paper-viewer';
import { SurveySidebar } from '@/components/layout/survey-sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useStatistics } from '@/hooks/use-statistics';
import { cn } from '@/lib/utils';

const MIN_CHAT_WIDTH = 280;
const MAX_CHAT_WIDTH = 500;
const DEFAULT_CHAT_WIDTH = 340;

export default function HomePage() {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const prevPaperIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Statistics
  const stats = useStatistics();

  // Initialize session ID from localStorage or create new one
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chat-session-id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = uuidv4();
      localStorage.setItem('chat-session-id', newSessionId);
      setSessionId(newSessionId);
    }
  }, []);

  // Track paper views
  useEffect(() => {
    if (selectedPaperId && selectedPaperId !== prevPaperIdRef.current) {
      stats.incrementPaperViews();
      prevPaperIdRef.current = selectedPaperId;
    }
  }, [selectedPaperId, stats]);

  // Chat panel resize handlers (horizontal)
  const startResizingChat = useCallback(() => {
    setIsResizingChat(true);
  }, []);

  const stopResizingChat = useCallback(() => {
    setIsResizingChat(false);
  }, []);

  const resizeChat = useCallback(
    (e: MouseEvent) => {
      if (isResizingChat && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = containerRect.right - e.clientX;
        if (newWidth >= MIN_CHAT_WIDTH && newWidth <= MAX_CHAT_WIDTH) {
          setChatWidth(newWidth);
        }
      }
    },
    [isResizingChat]
  );

  useEffect(() => {
    if (isResizingChat) {
      window.addEventListener('mousemove', resizeChat);
      window.addEventListener('mouseup', stopResizingChat);
    }
    return () => {
      window.removeEventListener('mousemove', resizeChat);
      window.removeEventListener('mouseup', stopResizingChat);
    };
  }, [isResizingChat, resizeChat, stopResizingChat]);

  const handleSearchResults = (papers: unknown[]) => {
    console.log('Search results:', papers);
  };

  const handleChatMessage = () => {
    stats.incrementChats();
  };

  const handleSurveyComplete = () => {
    stats.incrementSurveys();
  };

  return (
    <div ref={containerRef} className="h-screen bg-background flex flex-col overflow-hidden">
      <Header
        stats={{
          today: stats.today,
          cumulative: stats.cumulative,
        }}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Paper List */}
        {!isFullscreen && (
          <PaperListSidebar
            selectedPaperId={selectedPaperId}
            onSelectPaper={setSelectedPaperId}
          />
        )}

        {/* Center: Paper Viewer + Survey (if paper selected) */}
        <div className="flex-1 flex overflow-hidden" style={{ minWidth: 0 }}>
          {/* Main Paper Viewer */}
          <main className="flex-1 min-h-0 overflow-hidden" style={{ minWidth: '300px' }}>
            <PaperViewer
              paperId={selectedPaperId}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            />
          </main>

          {/* Survey Sidebar - Only when paper is selected */}
          {!isFullscreen && selectedPaperId && (
            <SurveySidebar
              paperId={selectedPaperId}
              sessionId={sessionId}
              onPaperSelect={setSelectedPaperId}
              onSurveyComplete={handleSurveyComplete}
            />
          )}
        </div>

        {/* Right Sidebar - Chat Panel */}
        {!isFullscreen && (
          <div
            className="flex flex-row shrink-0 h-full bg-background border-l"
            style={{ width: chatWidth, minWidth: MIN_CHAT_WIDTH }}
          >
            {/* Resize Handle - Elongated vertical bar */}
            <div
              className={cn(
                'w-3 cursor-col-resize flex items-center justify-center hover:bg-primary/20 transition-colors group relative',
                isResizingChat && 'bg-primary/30'
              )}
              onMouseDown={startResizingChat}
            >
              {/* Elongated grab indicator */}
              <div className={cn(
                'absolute h-16 w-1.5 rounded-full transition-all',
                isResizingChat
                  ? 'bg-primary'
                  : 'bg-slate-300 group-hover:bg-primary/60'
              )} />
            </div>

            {/* Chat Interface */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <ChatInterface
                paperId={selectedPaperId}
                onSearchResults={handleSearchResults}
                onPaperSelect={setSelectedPaperId}
                sessionId={sessionId}
                onMessageSent={handleChatMessage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
