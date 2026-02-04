'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';

interface DailyStats {
  date: string; // YYYY-MM-DD
  paperViews: number;
  surveys: number;
  chats: number;
}

interface CumulativeStats {
  totalPaperViews: number;
  totalSurveys: number;
  totalVisits: number;
  totalChats: number;
  firstVisit: string;
}

const getToday = () => new Date().toISOString().split('T')[0];

const DEFAULT_DAILY: DailyStats = {
  date: getToday(),
  paperViews: 0,
  surveys: 0,
  chats: 0,
};

const DEFAULT_CUMULATIVE: CumulativeStats = {
  totalPaperViews: 0,
  totalSurveys: 0,
  totalVisits: 0,
  totalChats: 0,
  firstVisit: new Date().toISOString(),
};

export function useStatistics() {
  const [dailyStats, setDailyStats, ] = useLocalStorage<DailyStats>(
    'aicosci-daily-stats',
    DEFAULT_DAILY
  );
  const [cumulativeStats, setCumulativeStats] = useLocalStorage<CumulativeStats>(
    'aicosci-cumulative-stats',
    DEFAULT_CUMULATIVE
  );
  const [initialized, setInitialized] = useState(false);

  // Reset daily stats if date changed
  useEffect(() => {
    const today = getToday();
    if (dailyStats.date !== today) {
      setDailyStats({
        ...DEFAULT_DAILY,
        date: today,
      });
    }
    setInitialized(true);
  }, [dailyStats.date, setDailyStats]);

  // Track visit on first load
  useEffect(() => {
    if (!initialized) return;

    // Only count visit once per session
    const sessionKey = 'aicosci-session-visit-counted';
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, 'true');
      setCumulativeStats((prev) => ({
        ...prev,
        totalVisits: prev.totalVisits + 1,
      }));
    }
  }, [initialized, setCumulativeStats]);

  const incrementPaperViews = useCallback(() => {
    const today = getToday();
    setDailyStats((prev) => ({
      ...prev,
      date: today,
      paperViews: prev.date === today ? prev.paperViews + 1 : 1,
    }));
    setCumulativeStats((prev) => ({
      ...prev,
      totalPaperViews: prev.totalPaperViews + 1,
    }));
  }, [setDailyStats, setCumulativeStats]);

  const incrementSurveys = useCallback(() => {
    const today = getToday();
    setDailyStats((prev) => ({
      ...prev,
      date: today,
      surveys: prev.date === today ? prev.surveys + 1 : 1,
    }));
    setCumulativeStats((prev) => ({
      ...prev,
      totalSurveys: prev.totalSurveys + 1,
    }));
  }, [setDailyStats, setCumulativeStats]);

  const incrementChats = useCallback(() => {
    const today = getToday();
    setDailyStats((prev) => ({
      ...prev,
      date: today,
      chats: prev.date === today ? prev.chats + 1 : 1,
    }));
    setCumulativeStats((prev) => ({
      ...prev,
      totalChats: prev.totalChats + 1,
    }));
  }, [setDailyStats, setCumulativeStats]);

  // Ensure daily stats are for today
  const todayStats = dailyStats.date === getToday() ? dailyStats : DEFAULT_DAILY;

  return {
    today: {
      paperViews: todayStats.paperViews,
      surveys: todayStats.surveys,
      chats: todayStats.chats,
    },
    cumulative: {
      totalPaperViews: cumulativeStats.totalPaperViews,
      totalSurveys: cumulativeStats.totalSurveys,
      totalVisits: cumulativeStats.totalVisits,
      totalChats: cumulativeStats.totalChats,
    },
    incrementPaperViews,
    incrementSurveys,
    incrementChats,
  };
}
