'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SurveyQuestion, SurveyResponse } from '@/types/database';

interface UseSurveyOptions {
  paperId: string;
  sessionId: string | null;
}

interface UseSurveyResult {
  questions: SurveyQuestion[];
  surveyCount: number;
  isCompleted: boolean;
  existingResponses: SurveyResponse[];
  isLoading: boolean;
  submitSurvey: (responses: SurveyResponse[]) => Promise<boolean>;
}

export function useSurvey({ paperId, sessionId }: UseSurveyOptions): UseSurveyResult {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [surveyCount, setSurveyCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [existingResponses, setExistingResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSurveyData = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/v1/papers/${paperId}/survey?session_id=${sessionId}`
      );
      const data = await response.json();

      if (data.success) {
        setQuestions(data.data.questions);
        setSurveyCount(data.data.survey_count);
        setIsCompleted(data.data.is_completed);
        setExistingResponses(data.data.survey?.responses || []);
      }
    } catch (error) {
      console.error('Error fetching survey data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [paperId, sessionId]);

  useEffect(() => {
    fetchSurveyData();
  }, [fetchSurveyData]);

  const submitSurvey = useCallback(async (responses: SurveyResponse[]): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await fetch(`/api/v1/papers/${paperId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          responses,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSurveyCount(data.data.survey_count);
        setIsCompleted(true);
        setExistingResponses(responses);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error submitting survey:', error);
      return false;
    }
  }, [paperId, sessionId]);

  return {
    questions,
    surveyCount,
    isCompleted,
    existingResponses,
    isLoading,
    submitSurvey,
  };
}
