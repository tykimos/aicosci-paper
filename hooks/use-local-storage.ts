'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing localStorage with React state synchronization
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove the item from localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * User profile stored in localStorage
 */
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  affiliation: string; // 소속
  updatedAt: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  phone: '',
  affiliation: '',
  updatedAt: '',
};

/**
 * Hook for managing user profile in localStorage
 */
export function useUserProfile() {
  const [profile, setProfile, removeProfile] = useLocalStorage<UserProfile>(
    'aicosci-user-profile',
    DEFAULT_PROFILE
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setProfile((prev) => ({
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      }));
    },
    [setProfile]
  );

  const hasProfile = profile.name.trim().length > 0 || profile.email.trim().length > 0;

  return {
    profile,
    setProfile,
    updateProfile,
    removeProfile,
    hasProfile,
  };
}

/**
 * Hook for tracking viewed papers in localStorage
 */
export function useViewedPapers() {
  const [viewedPapers, setViewedPapers] = useLocalStorage<Record<string, ViewedPaperInfo>>(
    'aicosci-viewed-papers',
    {}
  );

  const markAsViewed = useCallback(
    (paperId: string, title?: string) => {
      setViewedPapers((prev) => ({
        ...prev,
        [paperId]: {
          viewedAt: new Date().toISOString(),
          viewCount: (prev[paperId]?.viewCount || 0) + 1,
          title: title || prev[paperId]?.title || '',
        },
      }));
    },
    [setViewedPapers]
  );

  const isViewed = useCallback(
    (paperId: string) => {
      return paperId in viewedPapers;
    },
    [viewedPapers]
  );

  const getViewInfo = useCallback(
    (paperId: string): ViewedPaperInfo | null => {
      return viewedPapers[paperId] || null;
    },
    [viewedPapers]
  );

  const clearViewedPapers = useCallback(() => {
    setViewedPapers({});
  }, [setViewedPapers]);

  const viewedCount = Object.keys(viewedPapers).length;

  return {
    viewedPapers,
    markAsViewed,
    isViewed,
    getViewInfo,
    clearViewedPapers,
    viewedCount,
  };
}

export interface ViewedPaperInfo {
  viewedAt: string;
  viewCount: number;
  title: string;
}

/**
 * Hook for managing completed surveys in localStorage
 */
export function useCompletedSurveys() {
  const [completedSurveys, setCompletedSurveys] = useLocalStorage<
    Record<string, CompletedSurveyInfo>
  >('aicosci-completed-surveys', {});

  const markSurveyCompleted = useCallback(
    (paperId: string) => {
      setCompletedSurveys((prev) => ({
        ...prev,
        [paperId]: {
          completedAt: new Date().toISOString(),
        },
      }));
    },
    [setCompletedSurveys]
  );

  const isSurveyCompleted = useCallback(
    (paperId: string) => {
      return paperId in completedSurveys;
    },
    [completedSurveys]
  );

  return {
    completedSurveys,
    markSurveyCompleted,
    isSurveyCompleted,
    completedCount: Object.keys(completedSurveys).length,
  };
}

export interface CompletedSurveyInfo {
  completedAt: string;
}
