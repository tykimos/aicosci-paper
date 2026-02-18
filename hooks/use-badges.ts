'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './use-local-storage';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (ctx: BadgeContext) => boolean;
}

export interface EarnedBadge {
  id: string;
  earnedAt: string;
  syncedToDb: boolean;
}

export interface BadgeContext {
  viewedCount: number;
  surveyCount: number;
  chatCount: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_read',
    name: '첫 발걸음',
    description: '첫 번째 논문 읽기',
    icon: '👣',
    condition: (ctx) => ctx.viewedCount >= 1,
  },
  {
    id: 'reader_5',
    name: '탐험가',
    description: '논문 5편 읽기',
    icon: '🔍',
    condition: (ctx) => ctx.viewedCount >= 5,
  },
  {
    id: 'reader_10',
    name: '독서왕',
    description: '논문 10편 읽기',
    icon: '📚',
    condition: (ctx) => ctx.viewedCount >= 10,
  },
  {
    id: 'reader_30',
    name: '연구 마니아',
    description: '논문 30편 읽기',
    icon: '🏆',
    condition: (ctx) => ctx.viewedCount >= 30,
  },
  {
    id: 'first_survey',
    name: '리뷰어',
    description: '첫 번째 설문 완료',
    icon: '✍️',
    condition: (ctx) => ctx.surveyCount >= 1,
  },
  {
    id: 'survey_5',
    name: '열정 리뷰어',
    description: '설문 5편 완료',
    icon: '🔥',
    condition: (ctx) => ctx.surveyCount >= 5,
  },
  {
    id: 'survey_10',
    name: '마스터 리뷰어',
    description: '설문 10편 완료',
    icon: '⭐',
    condition: (ctx) => ctx.surveyCount >= 10,
  },
  {
    id: 'first_chat',
    name: 'AI 친구',
    description: '첫 번째 AI 채팅',
    icon: '💬',
    condition: (ctx) => ctx.chatCount >= 1,
  },
];

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('chat-session-id') || '';
}

export function useBadges(context: BadgeContext) {
  const [earnedBadges, setEarnedBadges] = useLocalStorage<Record<string, EarnedBadge>>(
    'aicosci-badges',
    {}
  );
  const [newBadge, setNewBadge] = useState<BadgeDefinition | null>(null);
  const prevContextRef = useRef<BadgeContext>({ viewedCount: 0, surveyCount: 0, chatCount: 0 });

  // Check and award badges
  const checkBadges = useCallback(() => {
    const newlyEarned: EarnedBadge[] = [];

    for (const badge of BADGE_DEFINITIONS) {
      if (!(badge.id in earnedBadges) && badge.condition(context)) {
        newlyEarned.push({
          id: badge.id,
          earnedAt: new Date().toISOString(),
          syncedToDb: false,
        });
      }
    }

    if (newlyEarned.length > 0) {
      setEarnedBadges((prev) => {
        const updated = { ...prev };
        for (const badge of newlyEarned) {
          updated[badge.id] = badge;
        }
        return updated;
      });

      // Show the latest badge notification
      const latestDef = BADGE_DEFINITIONS.find((d) => d.id === newlyEarned[newlyEarned.length - 1].id);
      if (latestDef) {
        setNewBadge(latestDef);
        setTimeout(() => setNewBadge(null), 4000);
      }

      // Sync to DB
      const sessionId = getSessionId();
      if (sessionId) {
        for (const badge of newlyEarned) {
          fetch('/api/v1/badges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              badge_id: badge.id,
              earned_at: badge.earnedAt,
            }),
          })
            .then(() => {
              setEarnedBadges((prev) => ({
                ...prev,
                [badge.id]: { ...prev[badge.id], syncedToDb: true },
              }));
            })
            .catch((err) => console.error('Badge sync failed:', err));
        }
      }
    }
  }, [context, earnedBadges, setEarnedBadges]);

  // Only check when context values actually change
  useEffect(() => {
    const prev = prevContextRef.current;
    if (
      prev.viewedCount !== context.viewedCount ||
      prev.surveyCount !== context.surveyCount ||
      prev.chatCount !== context.chatCount
    ) {
      prevContextRef.current = context;
      checkBadges();
    }
  }, [context, checkBadges]);

  const earnedList = BADGE_DEFINITIONS.filter((d) => d.id in earnedBadges);
  const unearnedList = BADGE_DEFINITIONS.filter((d) => !(d.id in earnedBadges));

  return {
    earnedBadges: earnedList,
    unearnedBadges: unearnedList,
    newBadge,
    totalEarned: earnedList.length,
    totalBadges: BADGE_DEFINITIONS.length,
  };
}
