'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
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
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle scroll tracking for progress
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onProgressChange) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
    onProgressChange(Math.min(100, Math.max(0, scrollPercent)));
  }, [onProgressChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Update progress when page changes
  useEffect(() => {
    if (numPages > 0 && onProgressChange) {
      const progress = ((pageNumber - 1) / (numPages - 1)) * 100;
      onProgressChange(progress);
    }
  }, [pageNumber, numPages, onProgressChange]);

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

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.0, prev + 0.1));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.1));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
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
      {/* Refined Controls */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-gradient-to-b from-background to-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="hover:bg-accent/80 transition-all duration-200"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums min-w-[4rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2.0}
            className="hover:bg-accent/80 transition-all duration-200"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handlePrevPage}
            disabled={pageNumber <= 1}
            className="hover:bg-accent/80 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums min-w-[5rem] text-center">
            <span className="text-foreground">{pageNumber}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-muted-foreground">{numPages || '—'}</span>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNextPage}
            disabled={pageNumber >= numPages}
            className="hover:bg-accent/80 transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gradient-to-br from-muted/30 to-muted/10"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex justify-center p-8">
          <div
            className="shadow-2xl rounded-sm overflow-hidden transition-all duration-300 ease-out"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center min-h-[600px] bg-white">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">문서를 불러오는 중...</p>
                  </div>
                </div>
              }
              className="pdf-document"
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="pdf-page"
              />
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
