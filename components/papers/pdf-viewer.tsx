'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
  fileUrl: string;
}

type LoadStep = 'worker' | 'container' | 'download' | 'render';
type StepState = 'pending' | 'loading' | 'done' | 'error';

export function PDFViewer({ fileUrl }: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(600);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [steps, setSteps] = useState<Record<LoadStep, { state: StepState; detail: string }>>({
    worker: { state: 'loading', detail: '' },
    container: { state: 'pending', detail: '' },
    download: { state: 'pending', detail: '' },
    render: { state: 'pending', detail: '' },
  });

  const setStep = useCallback((key: LoadStep, state: StepState, detail = '') => {
    setSteps(prev => ({ ...prev, [key]: { state, detail } }));
  }, []);

  const allDone = steps.render.state === 'done';

  // Step 1: Check worker
  useEffect(() => {
    fetch('/pdf.worker.min.mjs', { method: 'HEAD' })
      .then(res => {
        if (res.ok) setStep('worker', 'done', `v${pdfjs.version}`);
        else setStep('worker', 'error', `HTTP ${res.status}`);
      })
      .catch(() => setStep('worker', 'error', '네트워크 오류'));
  }, [setStep]);

  // Step 2: Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setStep('container', 'loading', '측정 중');

    const measure = () => {
      const w = el.clientWidth - 48;
      if (w > 0) {
        setContainerWidth(w);
        setStep('container', 'done', `${w}px`);
      }
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [setStep]);

  // Document callbacks
  const onLoadSuccess = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setStep('download', 'done', `${n}페이지`);
    setStep('render', 'loading', '렌더링 중');
    setTimeout(() => setStep('render', 'done', '완료'), 300);
  };

  const onLoadError = (err: Error) => {
    setError(err.message);
    setStep('download', 'error', err.message);
  };

  // Scroll for progress
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight <= clientHeight) return;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const stepLabels: Record<LoadStep, string> = {
    worker: 'PDF 엔진 초기화',
    container: '뷰어 영역 준비',
    download: '문서 다운로드',
    render: '페이지 렌더링',
  };

  const StepIcon = ({ s }: { s: StepState }) => {
    if (s === 'done') return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    if (s === 'loading') return <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />;
    if (s === 'error') return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    return <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Zoom bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} disabled={zoom <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums min-w-[3.5rem] text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))} disabled={zoom >= 2}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        {numPages > 0 && <span className="text-xs text-muted-foreground">{numPages}페이지</span>}
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900">
        {/* Loading steps overlay */}
        {!allDone && !error && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-xs w-full px-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">문서를 불러오는 중...</p>
              <div className="space-y-2 text-left bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border">
                {(['worker', 'container', 'download', 'render'] as LoadStep[]).map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <StepIcon s={steps[k].state} />
                    <span className={`text-xs ${steps[k].state === 'loading' ? 'text-blue-600 font-medium' : steps[k].state === 'done' ? 'text-green-700' : steps[k].state === 'error' ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {stepLabels[k]}
                    </span>
                    {steps[k].detail && <span className="text-[10px] text-muted-foreground ml-auto">{steps[k].detail}</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60">{fileUrl}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-3 max-w-xs">
              <XCircle className="h-10 w-10 text-red-500 mx-auto" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Document (hidden until loaded) */}
        <div className={allDone ? 'flex flex-col items-center py-4 px-6 gap-4' : 'absolute left-[-9999px]'}>
          <Document
            key={fileUrl}
            file={fileUrl}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            onLoadProgress={({ loaded, total }) => {
              const detail = total > 0 ? `${Math.round((loaded / total) * 100)}%` : `${Math.round(loaded / 1024)}KB`;
              setStep('download', 'loading', detail);
            }}
            loading={null}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                className="shadow-lg rounded-sm overflow-hidden bg-white mb-4 last:mb-0"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', marginBottom: `${16 * zoom}px` }}
              >
                <Page pageNumber={i + 1} width={containerWidth} renderTextLayer renderAnnotationLayer />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
