'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { PaperListSidebar } from '@/components/layout/paper-list-sidebar';
import { PaperViewer } from '@/components/papers/paper-viewer';
import { SurveySidebar } from '@/components/layout/survey-sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useStatistics } from '@/hooks/use-statistics';
import { useViewedPapers, useCompletedSurveys } from '@/hooks/use-local-storage';
import { useBadges } from '@/hooks/use-badges';
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
  const [isSurveyCollapsed, setIsSurveyCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const prevPaperIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  // Statistics
  const stats = useStatistics();
  const { viewedCount } = useViewedPapers();
  const { completedCount, isSurveyCompleted, markSurveyCompleted } = useCompletedSurveys();

  // Badges
  const badgeData = useBadges({
    viewedCount,
    surveyCount: completedCount,
    chatCount: stats.cumulative.totalChats,
  });

  // Initialize session ID from server (registers in anonymous_sessions table)
  useEffect(() => {
    const initSession = async () => {
      const storedSessionId = localStorage.getItem('chat-session-id');

      try {
        const res = await fetch('/api/v1/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: storedSessionId || undefined }),
        });
        const data = await res.json();

        if (data.success && data.data?.session_id) {
          const sid = data.data.session_id;
          localStorage.setItem('chat-session-id', sid);
          setSessionId(sid);
          return;
        }
      } catch (err) {
        console.error('Session init failed:', err);
      }

      // Fallback: use stored or generate new (won't be in DB but avoids blocking)
      if (storedSessionId) {
        setSessionId(storedSessionId);
      } else {
        const newId = uuidv4();
        localStorage.setItem('chat-session-id', newId);
        setSessionId(newId);
      }
    };

    initSession();
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
        badges={{
          earned: badgeData.earnedBadges,
          unearned: badgeData.unearnedBadges,
          newBadge: badgeData.newBadge,
          totalEarned: badgeData.totalEarned,
          totalBadges: badgeData.totalBadges,
        }}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Paper List */}
        {!isFullscreen && (
          <PaperListSidebar
            selectedPaperId={selectedPaperId}
            onSelectPaper={setSelectedPaperId}
            isSurveyCompleted={isSurveyCompleted}
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
                sessionId={sessionId}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              />
            </main>

            {/* Survey Sidebar - Only when paper is selected */}
            {!isFullscreen && selectedPaperId && (
              <>
                {/* Survey collapse toggle */}
                <button
                  onClick={() => setIsSurveyCollapsed(!isSurveyCollapsed)}
                  className="shrink-0 w-6 border-l bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
                  title={isSurveyCollapsed ? '설문 사이드바 펼치기' : '설문 사이드바 접기'}
                >
                  {isSurveyCollapsed ? <ChevronLeft className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className={cn(isSurveyCollapsed && 'hidden')}>
                  <SurveySidebar
                    paperId={selectedPaperId}
                    sessionId={sessionId}
                    onPaperSelect={setSelectedPaperId}
                    onSurveyComplete={handleSurveyComplete}
                    isSurveyCompleted={isSurveyCompleted}
                    markSurveyCompleted={markSurveyCompleted}
                  />
                </div>
              </>
            )}
          </div>

          {/* Bottom: Chat Panel */}
          {!isFullscreen && (
            <div
              className="border-t flex flex-col shrink-0 bg-background"
              style={{ height: isChatCollapsed ? 36 : chatHeight }}
            >
              {/* Resize Handle + Collapse toggle */}
              <div className="flex items-center shrink-0">
                <div
                  className={cn(
                    'flex-1 h-2 cursor-row-resize flex items-center justify-center hover:bg-primary/20 transition-colors group relative',
                    isResizingChat && 'bg-primary/30',
                    isChatCollapsed && 'cursor-default'
                  )}
                  onMouseDown={isChatCollapsed ? undefined : startResizingChat}
                >
                  {!isChatCollapsed && (
                    <div className={cn(
                      'absolute w-16 h-1.5 rounded-full transition-all',
                      isResizingChat
                        ? 'bg-primary'
                        : 'bg-slate-300 group-hover:bg-primary/60'
                    )} />
                  )}
                </div>
                <button
                  onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                  className="shrink-0 h-8 px-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title={isChatCollapsed ? '채팅창 펼치기' : '채팅창 접기'}
                >
                  {isChatCollapsed ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>채팅</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      <span>접기</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat Interface - always mounted, hidden when collapsed */}
              <div className={cn('flex-1 min-h-0 overflow-hidden', isChatCollapsed && 'hidden')}>
                <ChatInterface
                  paperId={selectedPaperId}
                  onSearchResults={handleSearchResults}
                  onPaperSelect={setSelectedPaperId}
                  sessionId={sessionId}
                  onMessageSent={handleChatMessage}
                  paperReadCount={stats.cumulative.totalPaperViews}
                  surveyCompleteCount={stats.cumulative.totalSurveys}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
