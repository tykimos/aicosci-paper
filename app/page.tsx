'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from '@/components/layout/header';
import { PaperListSidebar } from '@/components/layout/paper-list-sidebar';
import { PaperViewer } from '@/components/papers/paper-viewer';
import { SurveySidebar } from '@/components/layout/survey-sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useStatistics } from '@/hooks/use-statistics';

export default function HomePage() {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const prevPaperIdRef = useRef<string | null>(null);

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

  const handleSearchResults = (papers: unknown[]) => {
    // This could be used to update the paper list if needed
    console.log('Search results:', papers);
  };

  const handleChatMessage = () => {
    stats.incrementChats();
  };

  const handleSurveyComplete = () => {
    stats.incrementSurveys();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        stats={{
          today: stats.today,
          cumulative: stats.cumulative,
        }}
      />
      <div className="flex flex-1 min-h-0">
        {!isFullscreen && (
          <PaperListSidebar
            selectedPaperId={selectedPaperId}
            onSelectPaper={setSelectedPaperId}
          />
        )}
        <main className="flex-1 min-w-0 overflow-hidden">
          <PaperViewer
            paperId={selectedPaperId}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        </main>
        {!isFullscreen && selectedPaperId && (
          <SurveySidebar
            paperId={selectedPaperId}
            sessionId={sessionId}
            onPaperSelect={setSelectedPaperId}
            onSurveyComplete={handleSurveyComplete}
          />
        )}
      </div>
      {!isFullscreen && (
        <div className="h-80 border-t">
          <ChatInterface
            paperId={selectedPaperId}
            onSearchResults={handleSearchResults}
            onPaperSelect={setSelectedPaperId}
            sessionId={sessionId}
            onMessageSent={handleChatMessage}
          />
        </div>
      )}
    </div>
  );
}
