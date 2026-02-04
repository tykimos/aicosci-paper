'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import mammoth from 'mammoth';
import { Loader2 } from 'lucide-react';

interface DOCXViewerProps {
  fileUrl: string;
  onProgressChange?: (percent: number) => void;
}

export function DOCXViewer({ fileUrl, onProgressChange }: DOCXViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
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

  useEffect(() => {
    const loadDocx = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1.docx-heading-1",
              "p[style-name='Heading 2'] => h2.docx-heading-2",
              "p[style-name='Heading 3'] => h3.docx-heading-3",
              "p[style-name='Title'] => h1.docx-title",
              "p[style-name='Subtitle'] => h2.docx-subtitle",
            ],
          }
        );

        setHtmlContent(result.value);
        setLoading(false);
      } catch (err) {
        console.error('DOCX load error:', err);
        setError('문서를 불러올 수 없습니다');
        setLoading(false);
      }
    };

    loadDocx();
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-gradient-to-br from-muted/30 to-muted/10"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="max-w-4xl mx-auto p-8 md:p-12 lg:p-16">
        <article
          className="bg-white shadow-2xl rounded-lg p-8 md:p-12 lg:p-16 docx-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      <style jsx global>{`
        .docx-content {
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 1.8;
          color: oklch(0.145 0 0);
        }

        .docx-content h1,
        .docx-content h2,
        .docx-content h3,
        .docx-content h4,
        .docx-content h5,
        .docx-content h6 {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 700;
          letter-spacing: -0.025em;
          margin-top: 2em;
          margin-bottom: 0.75em;
          line-height: 1.2;
          color: oklch(0.145 0 0);
        }

        .docx-content h1 {
          font-size: 2.25rem;
          margin-top: 0;
          border-bottom: 2px solid oklch(0.922 0 0);
          padding-bottom: 0.5rem;
        }

        .docx-content h2 {
          font-size: 1.875rem;
        }

        .docx-content h3 {
          font-size: 1.5rem;
        }

        .docx-content h4 {
          font-size: 1.25rem;
        }

        .docx-content .docx-title {
          font-size: 2.5rem;
          text-align: center;
          margin-bottom: 0.5rem;
          font-weight: 800;
        }

        .docx-content .docx-subtitle {
          font-size: 1.5rem;
          text-align: center;
          color: oklch(0.556 0 0);
          margin-bottom: 2rem;
          font-weight: 400;
        }

        .docx-content p {
          margin-bottom: 1.25em;
          text-align: justify;
          hyphens: auto;
        }

        .docx-content ul,
        .docx-content ol {
          margin: 1.5em 0;
          padding-left: 2em;
        }

        .docx-content li {
          margin-bottom: 0.5em;
          line-height: 1.7;
        }

        .docx-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2em 0;
          font-size: 0.95em;
        }

        .docx-content th,
        .docx-content td {
          border: 1px solid oklch(0.922 0 0);
          padding: 0.75rem 1rem;
          text-align: left;
        }

        .docx-content th {
          background-color: oklch(0.97 0 0);
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .docx-content tr:nth-child(even) {
          background-color: oklch(0.985 0 0);
        }

        .docx-content strong,
        .docx-content b {
          font-weight: 700;
          color: oklch(0.205 0 0);
        }

        .docx-content em,
        .docx-content i {
          font-style: italic;
        }

        .docx-content a {
          color: oklch(0.488 0.243 264.376);
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 2px;
          transition: color 0.2s ease;
        }

        .docx-content a:hover {
          color: oklch(0.398 0.243 264.376);
        }

        .docx-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 2em auto;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .docx-content blockquote {
          border-left: 4px solid oklch(0.488 0.243 264.376);
          padding-left: 1.5rem;
          margin: 2em 0;
          color: oklch(0.556 0 0);
          font-style: italic;
        }

        .docx-content code {
          background-color: oklch(0.97 0 0);
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
        }

        .docx-content pre {
          background-color: oklch(0.145 0 0);
          color: oklch(0.985 0 0);
          padding: 1.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 2em 0;
        }

        .docx-content pre code {
          background-color: transparent;
          padding: 0;
          color: inherit;
        }

        /* Dark mode support */
        .dark .docx-content {
          background-color: oklch(0.205 0 0);
          color: oklch(0.985 0 0);
        }

        .dark .docx-content h1,
        .dark .docx-content h2,
        .dark .docx-content h3,
        .dark .docx-content h4,
        .dark .docx-content h5,
        .dark .docx-content h6 {
          color: oklch(0.985 0 0);
        }

        .dark .docx-content h1 {
          border-bottom-color: oklch(1 0 0 / 10%);
        }

        .dark .docx-content .docx-subtitle {
          color: oklch(0.708 0 0);
        }

        .dark .docx-content strong,
        .dark .docx-content b {
          color: oklch(0.985 0 0);
        }

        .dark .docx-content th {
          background-color: oklch(0.269 0 0);
        }

        .dark .docx-content tr:nth-child(even) {
          background-color: oklch(0.185 0 0);
        }

        .dark .docx-content th,
        .dark .docx-content td {
          border-color: oklch(1 0 0 / 10%);
        }

        .dark .docx-content code {
          background-color: oklch(0.269 0 0);
        }

        .dark .docx-content blockquote {
          color: oklch(0.708 0 0);
        }
      `}</style>
    </div>
  );
}
