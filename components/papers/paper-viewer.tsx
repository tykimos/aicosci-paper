'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Download, Loader2 } from 'lucide-react';
import type { Paper } from '@/types/database';

// Dynamic imports to avoid SSR issues with PDF.js
const PDFViewer = dynamic(
  () => import('./pdf-viewer').then((mod) => ({ default: mod.PDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

const DOCXViewer = dynamic(
  () => import('./docx-viewer').then((mod) => ({ default: mod.DOCXViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

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
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState<number>(0);

  // Fetch paper data when paperId changes
  useEffect(() => {
    if (!paperId) {
      setPaper(null);
      setReadingProgress(0);
      return;
    }

    const fetchPaper = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/papers/${paperId}`);
        if (!response.ok) {
          throw new Error('논문을 불러올 수 없습니다');
        }

        const data = await response.json();
        if (data.success && data.data) {
          setPaper(data.data.paper || data.data);
        } else {
          throw new Error(data.error?.message || '논문 데이터를 불러올 수 없습니다');
        }
      } catch (err) {
        console.error('Failed to fetch paper:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchPaper();
  }, [paperId]);

  const handleDownload = async () => {
    if (!paper) return;

    try {
      const response = await fetch(paper.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paper.title}.${paper.file_type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleProgressChange = (percent: number) => {
    setReadingProgress(percent);
  };

  // Render viewer based on file type
  const renderViewer = useMemo(() => {
    if (!paper) return null;

    if (paper.file_type === 'pdf') {
      return (
        <PDFViewer fileUrl={paper.file_url} onProgressChange={handleProgressChange} />
      );
    } else if (paper.file_type === 'docx' || paper.file_type === 'doc') {
      return (
        <DOCXViewer fileUrl={paper.file_url} onProgressChange={handleProgressChange} />
      );
    }

    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">지원하지 않는 파일 형식입니다</p>
      </div>
    );
  }, [paper]);

  if (!paperId) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-muted-foreground/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">논문을 선택해주세요</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              왼쪽 목록에서 읽고 싶은 논문을 선택하면
              <br />
              여기에 표시됩니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">논문을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar with paper title and controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-b from-background to-background/95 backdrop-blur-sm">
        <div className="flex-1 min-w-0 mr-4">
          <h2 className="text-sm font-semibold truncate" title={paper?.title}>
            {paper?.title}
          </h2>
          {paper?.authors && paper.authors.length > 0 && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {paper.authors.join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Reading progress indicator */}
          {readingProgress > 0 && (
            <div className="hidden md:flex items-center gap-2 mr-2">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums min-w-[3rem]">
                {Math.round(readingProgress)}%
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDownload}
            className="hover:bg-accent/80 transition-all duration-200"
            title="다운로드"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleFullscreen}
            className="hover:bg-accent/80 transition-all duration-200"
            title={isFullscreen ? '전체화면 종료' : '전체화면'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Viewer area */}
      <div className="flex-1 overflow-hidden">{renderViewer}</div>
    </div>
  );
}
