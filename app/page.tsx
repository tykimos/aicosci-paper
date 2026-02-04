'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GripHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { PaperListSidebar } from '@/components/layout/paper-list-sidebar';
import { PaperViewer } from '@/components/papers/paper-viewer';
import { SurveySidebar } from '@/components/layout/survey-sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useStatistics } from '@/hooks/use-statistics';
import { cn } from '@/lib/utils';

const MIN_CHAT_HEIGHT = 150;
const MAX_CHAT_HEIGHT = 600;
const DEFAULT_CHAT_HEIGHT = 320;

export default function HomePage() {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [chatHeight, setChatHeight] = useState(DEFAULT_CHAT_HEIGHT);
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

  // Chat panel resize handlers
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
        const newHeight = containerRect.bottom - e.clientY;
        if (newHeight >= MIN_CHAT_HEIGHT && newHeight <= MAX_CHAT_HEIGHT) {
          setChatHeight(newHeight);
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
        {/* Left Sidebar - Independent Scroll */}
        {!isFullscreen && (
          <PaperListSidebar
            selectedPaperId={selectedPaperId}
            onSelectPaper={setSelectedPaperId}
          />
        )}

        {/* Main Paper Viewer - Independent Scroll */}
        <main className="flex-1 min-w-0 overflow-hidden">
          <PaperViewer
            paperId={selectedPaperId}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        </main>

        {/* Right Survey Sidebar - Independent Scroll */}
        {!isFullscreen && selectedPaperId && (
          <SurveySidebar
            paperId={selectedPaperId}
            sessionId={sessionId}
            onPaperSelect={setSelectedPaperId}
            onSurveyComplete={handleSurveyComplete}
          />
        )}
      </div>

      {/* Resizable Chat Panel */}
      {!isFullscreen && (
        <div
          className="border-t flex flex-col shrink-0"
          style={{ height: chatHeight }}
        >
          {/* Resize Handle */}
          <div
            className={cn(
              'h-2 cursor-row-resize flex items-center justify-center hover:bg-primary/10 transition-colors group border-b',
              isResizingChat && 'bg-primary/20'
            )}
            onMouseDown={startResizingChat}
          >
            <GripHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Chat Interface */}
          <div className="flex-1 min-h-0 overflow-hidden">
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
  );
}
