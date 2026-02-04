'use client';

import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        exitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
