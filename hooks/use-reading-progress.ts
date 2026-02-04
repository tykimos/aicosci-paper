'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ReadingProgress {
  scrollPercentage: number;
  isComplete: boolean;
  timeSpent: number;
}

interface UseReadingProgressOptions {
  paperId: string | null;
  sessionId: string | null;
  completionThreshold?: number; // Percentage to consider "complete" (default: 90)
  debounceMs?: number;
}

export function useReadingProgress({
  paperId,
  sessionId,
  completionThreshold = 90,
  debounceMs = 1000,
}: UseReadingProgressOptions) {
  const [progress, setProgress] = useState<ReadingProgress>({
    scrollPercentage: 0,
    isComplete: false,
    timeSpent: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const lastSaveRef = useRef<number>(0);
  const previousCompleteRef = useRef(false);

  // Initialize time tracking when paper changes
  useEffect(() => {
    if (paperId) {
      startTimeRef.current = Date.now();
      previousCompleteRef.current = false;
      setProgress({
        scrollPercentage: 0,
        isComplete: false,
        timeSpent: 0,
      });
    }

    return () => {
      startTimeRef.current = null;
    };
  }, [paperId]);

  // Save progress to backend
  const saveProgress = useCallback(
    async (currentProgress: ReadingProgress) => {
      if (!paperId || !sessionId) return;

      const now = Date.now();
      if (now - lastSaveRef.current < debounceMs) return;
      lastSaveRef.current = now;

      setIsSaving(true);
      try {
        await fetch(`/api/v1/papers/${paperId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            scrollPercentage: Math.round(currentProgress.scrollPercentage),
            readComplete: currentProgress.isComplete,
            timeSpentSeconds: currentProgress.timeSpent,
          }),
        });
      } catch (error) {
        console.error('Failed to save reading progress:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [paperId, sessionId, debounceMs]
  );

  // Update scroll percentage
  const updateScrollProgress = useCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      if (!paperId) return;

      const maxScroll = scrollHeight - clientHeight;
      const percentage = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      const isComplete = percentage >= completionThreshold;

      // Calculate time spent
      const timeSpent = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;

      const newProgress = {
        scrollPercentage: Math.min(percentage, 100),
        isComplete,
        timeSpent,
      };

      setProgress(newProgress);

      // Save progress when reaching milestones or completing
      if (
        (isComplete && !previousCompleteRef.current) ||
        percentage >= 25 ||
        percentage >= 50 ||
        percentage >= 75
      ) {
        saveProgress(newProgress);
        previousCompleteRef.current = isComplete;
      }
    },
    [paperId, completionThreshold, saveProgress]
  );

  // Mark as complete manually (e.g., for PDFs at last page)
  const markAsComplete = useCallback(() => {
    if (!paperId) return;

    const timeSpent = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    const newProgress = {
      scrollPercentage: 100,
      isComplete: true,
      timeSpent,
    };

    setProgress(newProgress);
    saveProgress(newProgress);
  }, [paperId, saveProgress]);

  return {
    progress,
    isSaving,
    updateScrollProgress,
    markAsComplete,
  };
}
