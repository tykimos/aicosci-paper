'use client';

import { useState, useEffect, useRef, ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { Paper } from '@/types/database';

interface PDFViewerProps {
  fileUrl: string;
}

// Module loading state
type ModuleState =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: number }
  | { status: 'loaded'; component: ComponentType<PDFViewerProps>; elapsed: number }
  | { status: 'error'; error: string; elapsed: number };

// Shared module cache across renders
let cachedModule: { component: ComponentType<PDFViewerProps> } | null = null;
let modulePromise: Promise<ComponentType<PDFViewerProps>> | null = null;

function loadPDFViewerModule(): Promise<ComponentType<PDFViewerProps>> {
  if (cachedModule) return Promise.resolve(cachedModule.component);
  if (modulePromise) return modulePromise;

  modulePromise = import('./pdf-viewer')
    .then((mod) => {
      cachedModule = { component: mod.PDFViewer };
      return mod.PDFViewer;
    })
    .catch((err) => {
      modulePromise = null; // Allow retry
      throw err;
    });

  return modulePromise;
}

// Preload immediately when this module is loaded (page JS loads)
if (typeof window !== 'undefined') {
  loadPDFViewerModule().catch(() => {});
}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadStep, setLoadStep] = useState('');

  // Module loading - always start as 'idle' to match server render (avoid hydration mismatch)
  const [moduleState, setModuleState] = useState<ModuleState>({ status: 'idle' });
  const [viewerMode, setViewerMode] = useState<'react-pdf' | 'iframe'>('react-pdf');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const moduleTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Load module on mount if not already loaded
  useEffect(() => {
    if (cachedModule) {
      setModuleState({ status: 'loaded', component: cachedModule.component, elapsed: 0 });
      return;
    }

    const startTime = Date.now();
    setModuleState({ status: 'loading', startedAt: startTime });

    // Update elapsed time every 500ms
    moduleTimerRef.current = setInterval(() => {
      setModuleState(prev => {
        if (prev.status === 'loading') {
          return { ...prev, startedAt: prev.startedAt };
        }
        return prev;
      });
    }, 500);

    loadPDFViewerModule()
      .then((comp) => {
        clearInterval(moduleTimerRef.current);
        setModuleState({ status: 'loaded', component: comp, elapsed: Date.now() - startTime });
      })
      .catch((err) => {
        clearInterval(moduleTimerRef.current);
        const msg = err instanceof Error ? err.message : String(err);
        setModuleState({ status: 'error', error: msg, elapsed: Date.now() - startTime });
        setViewerMode('iframe'); // Auto-fallback
      });

    return () => clearInterval(moduleTimerRef.current);
  }, []);

  // Fetch paper data
  useEffect(() => {
    if (!paperId) {
      setPaper(null);
      setLoading(false);
      setLoadStep('');
      setIframeLoaded(false);
      return;
    }

    setPaper(null);
    setLoading(true);
    setError(null);
    setIframeLoaded(false);
    setLoadStep('연구보고서 정보 조회 중...');

    const fetchPaper = async () => {
      try {
        const response = await fetch(`/api/v1/papers/${paperId}`);
        if (!response.ok) throw new Error('연구보고서를 불러올 수 없습니다');

        const data = await response.json();
        if (data.success && data.data) {
          setPaper(data.data.paper || data.data);
          setLoadStep('');
        } else {
          throw new Error(data.error?.message || '연구보고서 데이터를 불러올 수 없습니다');
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

  // No paper selected
  if (!paperId) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <svg className="w-10 h-10 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">연구보고서를 선택해주세요</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              왼쪽 목록에서 읽고 싶은 연구보고서를 선택하면<br />여기에 표시됩니다
            </p>
          </div>

          {/* Module preload status */}
          <div className="mt-4 text-left bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border max-w-xs mx-auto">
            <p className="text-[10px] font-medium text-muted-foreground mb-2">PDF 뷰어 상태</p>
            <div className="flex items-center gap-2">
              {moduleState.status === 'loaded' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
              {moduleState.status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />}
              {moduleState.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              {moduleState.status === 'idle' && <div className="h-3.5 w-3.5 rounded-full border-2 border-muted shrink-0" />}
              <span className="text-[11px] text-muted-foreground">
                {moduleState.status === 'idle' && '대기 중'}
                {moduleState.status === 'loading' && `모듈 로딩 중... (${((Date.now() - moduleState.startedAt) / 1000).toFixed(1)}초)`}
                {moduleState.status === 'loaded' && `준비 완료 (${(moduleState.elapsed / 1000).toFixed(1)}초)`}
                {moduleState.status === 'error' && `실패: ${moduleState.error}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading paper data
  if (loading || !paper) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">{loadStep || '연구보고서를 불러오는 중...'}</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Determine if react-pdf is ready
  const canUseReactPdf = moduleState.status === 'loaded';
  const actualMode = viewerMode === 'react-pdf' && canUseReactPdf ? 'react-pdf' : 'iframe';
  const ReactPDFViewer = moduleState.status === 'loaded' ? moduleState.component : null;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-b from-background to-background/95 backdrop-blur-sm">
        <div className="flex-1 min-w-0 mr-4">
          <h2 className="text-sm font-semibold truncate" title={paper.title}>{paper.title}</h2>
          {paper.authors && paper.authors.length > 0 && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{paper.authors.join(', ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Module status indicator */}
          <div className="flex items-center gap-1 mr-1">
            {moduleState.status === 'loaded' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            {moduleState.status === 'loading' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
            {moduleState.status === 'error' && <XCircle className="h-3 w-3 text-red-500" />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewerMode(viewerMode === 'react-pdf' ? 'iframe' : 'react-pdf');
              setIframeLoaded(false);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {actualMode === 'react-pdf' ? '기본 뷰어' : '고급 뷰어'}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleFullscreen}
            className="hover:bg-accent/80 transition-all duration-200"
            title={isFullscreen ? '전체화면 종료' : '전체화면'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Viewer area */}
      <div className="flex-1 overflow-hidden relative">
        {/* react-pdf waiting for module */}
        {viewerMode === 'react-pdf' && !canUseReactPdf && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900 z-10">
            <div className="text-center space-y-4 max-w-xs px-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">PDF 고급 뷰어 로딩 중...</p>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border text-left space-y-2">
                <div className="flex items-center gap-2">
                  {moduleState.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />}
                  {moduleState.status === 'error' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  {moduleState.status === 'idle' && <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />}
                  <span className="text-xs">
                    {moduleState.status === 'loading' && `react-pdf 모듈 다운로드 중... (${((Date.now() - moduleState.startedAt) / 1000).toFixed(0)}초)`}
                    {moduleState.status === 'error' && `모듈 로드 실패: ${moduleState.error}`}
                    {moduleState.status === 'idle' && '모듈 로딩 시작 대기'}
                  </span>
                </div>
                {moduleState.status === 'error' && (
                  <p className="text-[10px] text-muted-foreground">iframe 뷰어로 자동 전환됩니다.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* react-pdf viewer (when loaded) */}
        {actualMode === 'react-pdf' && ReactPDFViewer && (
          <ReactPDFViewer fileUrl={paper.file_url} />
        )}

        {/* iframe viewer */}
        {actualMode === 'iframe' && (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900 z-10">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">PDF 문서 로딩 중...</p>
                </div>
              </div>
            )}
            <iframe
              key={paper.id}
              src={paper.file_url}
              className="w-full h-full border-0"
              title={paper.title}
              onLoad={() => setIframeLoaded(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
