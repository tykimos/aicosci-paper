'use client';

import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface PaperViewerProps {
  paperId: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function PaperViewer({
  paperId,
  isFullscreen,
  onToggleFullscreen,
}: PaperViewerProps) {
  if (!paperId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            왼쪽 목록에서 논문을 선택하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 툴바 */}
      <div className="flex items-center justify-between p-2 border-b bg-background">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">100%</span>
          <Button variant="ghost" size="icon-sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onToggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 뷰어 영역 */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 min-h-[800px]">
          <p className="text-muted-foreground text-center">
            논문 ID: {paperId}
            <br />
            (PDF/DOCX 뷰어가 여기에 표시됩니다)
          </p>
        </div>
      </div>
    </div>
  );
}
