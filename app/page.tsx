'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { PaperListSidebar } from '@/components/layout/paper-list-sidebar';
import { PaperViewer } from '@/components/papers/paper-viewer';
import { SurveySidebar } from '@/components/layout/survey-sidebar';

export default function HomePage() {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-3.5rem)]">
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
          <SurveySidebar paperId={selectedPaperId} />
        )}
      </div>
    </div>
  );
}
