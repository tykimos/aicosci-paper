'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_STORAGE_KEY = 'aicosci_session_id';

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const createOrRefreshSession = useCallback(async (existingSessionId?: string) => {
    try {
      const response = await fetch('/api/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: existingSessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSessionId = data.data?.session_id;
        if (newSessionId) {
          localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
          setSessionId(newSessionId);
          return newSessionId;
        }
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
    return null;
  }, []);

  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);

      // Try to get existing session from localStorage
      const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);

      if (storedSessionId) {
        // Validate/refresh existing session
        await createOrRefreshSession(storedSessionId);
      } else {
        // Create new session
        await createOrRefreshSession();
      }

      setIsLoading(false);
    };

    initSession();
  }, [createOrRefreshSession]);

  return {
    sessionId,
    isLoading,
    refreshSession: () => createOrRefreshSession(sessionId || undefined),
  };
}
