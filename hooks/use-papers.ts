'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Paper, Tag } from '@/types/database';

interface UsePapersOptions {
  search?: string;
  tags?: string[];
  sort?: 'newest' | 'votes' | 'surveys';
  page?: number;
  limit?: number;
}

interface UsePapersResult {
  papers: Paper[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
}

export function usePapers(options: UsePapersOptions = {}): UsePapersResult {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchPapers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (options.search) params.set('search', options.search);
      if (options.sort) params.set('sort', options.sort);
      if (options.page) params.set('page', options.page.toString());
      if (options.limit) params.set('limit', options.limit.toString());

      options.tags?.forEach(tag => params.append('tags', tag));

      const response = await fetch(`/api/v1/papers?${params}`);
      const data = await response.json();

      if (data.success) {
        setPapers(data.data.papers);
        setTotalCount(data.meta?.total || 0);
        setHasMore(data.meta?.has_more || false);
      } else {
        setError(data.error?.message || 'Failed to fetch papers');
      }
    } catch (err) {
      setError('Failed to fetch papers');
      console.error('Error fetching papers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.search, options.sort, options.page, options.limit, options.tags]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  return {
    papers,
    isLoading,
    error,
    totalCount,
    hasMore,
    refetch: fetchPapers,
  };
}

// Tags hook
interface UseTagsResult {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
}

export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/v1/tags');
        const data = await response.json();

        if (data.success) {
          setTags(data.data.tags);
        } else {
          setError(data.error?.message || 'Failed to fetch tags');
        }
      } catch (err) {
        setError('Failed to fetch tags');
        console.error('Error fetching tags:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  return { tags, isLoading, error };
}
