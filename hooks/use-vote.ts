'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseVoteOptions {
  paperId: string;
  sessionId: string | null;
}

interface UseVoteResult {
  voteCount: number;
  userVote: 'up' | 'down' | null;
  isLoading: boolean;
  vote: (type: 'up' | 'down') => Promise<void>;
  removeVote: () => Promise<void>;
}

export function useVote({ paperId, sessionId }: UseVoteOptions): UseVoteResult {
  const [voteCount, setVoteCount] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVoteStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/v1/papers/${paperId}/vote?session_id=${sessionId}`
      );
      const data = await response.json();

      if (data.success) {
        setVoteCount(data.data.vote_count);
        setUserVote(data.data.user_vote);
      }
    } catch (error) {
      console.error('Error fetching vote status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [paperId, sessionId]);

  useEffect(() => {
    fetchVoteStatus();
  }, [fetchVoteStatus]);

  const vote = useCallback(async (type: 'up' | 'down') => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/v1/papers/${paperId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_type: type,
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVoteCount(data.data.vote_count);
        setUserVote(data.data.user_vote);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  }, [paperId, sessionId]);

  const removeVote = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/v1/papers/${paperId}/vote?session_id=${sessionId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setVoteCount(data.data.vote_count);
        setUserVote(null);
      }
    } catch (error) {
      console.error('Error removing vote:', error);
    }
  }, [paperId, sessionId]);

  return {
    voteCount,
    userVote,
    isLoading,
    vote,
    removeVote,
  };
}
