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
const MAX_CHAT_HEIGHT = 500;
const DEFAULT_CHAT_HEIGHT = 280;

export default function HomePage() {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [chatHeight, setChatHeight] = useState(DEFAULT_CHAT_HEIGHT);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const prevPaperIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

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

  // Chat panel resize handlers (vertical)
  const startResizingChat = useCallback(() => {
    setIsResizingChat(true);
  }, []);

  const stopResizingChat = useCallback(() => {
    setIsResizingChat(false);
  }, []);

  const resizeChat = useCallback(
    (e: MouseEvent) => {
      if (isResizingChat && centerRef.current) {
        const centerRect = centerRef.current.getBoundingClientRect();
        const newHeight = centerRect.bottom - e.clientY;
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
        {/* Left Sidebar - Paper List */}
        {!isFullscreen && (
          <PaperListSidebar
            selectedPaperId={selectedPaperId}
            onSelectPaper={setSelectedPaperId}
          />
        )}

        {/* Center: Paper Viewer + Chat (bottom) */}
        <div ref={centerRef} className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
          {/* Top: Paper Viewer + Survey Sidebar */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Main Paper Viewer */}
            <main className="flex-1 min-h-0 overflow-hidden">
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

          {/* Bottom: Chat Panel */}
          {!isFullscreen && (
            <div
              className="border-t flex flex-col shrink-0 bg-background"
              style={{ height: chatHeight }}
            >
              {/* Resize Handle - Horizontal bar */}
              <div
                className={cn(
                  'h-2 cursor-row-resize flex items-center justify-center hover:bg-primary/20 transition-colors group relative',
                  isResizingChat && 'bg-primary/30'
                )}
                onMouseDown={startResizingChat}
              >
                {/* Elongated grab indicator */}
                <div className={cn(
                  'absolute w-16 h-1.5 rounded-full transition-all',
                  isResizingChat
                    ? 'bg-primary'
                    : 'bg-slate-300 group-hover:bg-primary/60'
                )} />
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
      </div>
    </div>
  );
}
