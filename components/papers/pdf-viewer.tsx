'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string;
  onProgressChange?: (percent: number) => void;
}

export function PDFViewer({ fileUrl, onProgressChange }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle scroll tracking for progress
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onProgressChange) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight <= clientHeight) {
      onProgressChange(100);
      return;
    }
    const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
    onProgressChange(Math.min(100, Math.max(0, scrollPercent)));
  }, [onProgressChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Track container width for responsive pages
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 48); // Account for padding
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('문서를 불러올 수 없습니다');
    setLoading(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.0, prev + 0.1));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.1));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
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
    <div className="flex flex-col h-full">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="hover:bg-accent/80"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums min-w-[3.5rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2.0}
            className="hover:bg-accent/80"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {numPages > 0 && (
          <span className="text-xs text-muted-foreground">
            {numPages}페이지
          </span>
        )}
      </div>

      {/* PDF Canvas - Continuous Scroll */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900"
      >
        <div className="flex flex-col items-center py-4 px-6 gap-4">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">문서를 불러오는 중...</p>
                </div>
              </div>
            }
            className="pdf-document"
          >
            {/* Render all pages for continuous scroll */}
            {Array.from(new Array(numPages), (_, index) => (
              <div
                key={`page_${index + 1}`}
                className="shadow-lg rounded-sm overflow-hidden bg-white mb-4 last:mb-0"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  marginBottom: `${16 * zoom}px`,
                }}
              >
                <Page
                  pageNumber={index + 1}
                  width={containerWidth > 0 ? containerWidth : undefined}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="pdf-page"
                />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
