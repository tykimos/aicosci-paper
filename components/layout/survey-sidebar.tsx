'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  PartyPopper,
  Sparkles,
  FileText,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useUserProfile, useCompletedSurveys } from '@/hooks/use-local-storage';
import type { SurveyQuestion, Paper } from '@/types/database';

interface SurveySidebarProps {
  paperId: string;
  sessionId: string | null;
  onPaperSelect?: (paperId: string) => void;
  onSurveyComplete?: () => void;
}

interface RecommendedPaper extends Paper {
  similarity: number;
  reason: string;
}

export function SurveySidebar({ paperId, sessionId, onPaperSelect, onSurveyComplete }: SurveySidebarProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedPaper[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [surveyCount, setSurveyCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  // Local storage hooks
  const { profile, updateProfile, hasProfile } = useUserProfile();
  const { markSurveyCompleted, isSurveyCompleted } = useCompletedSurveys();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    affiliation: '',
  });

  // Sync profile form with stored profile
  useEffect(() => {
    setProfileForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      affiliation: profile.affiliation,
    });
  }, [profile]);

  // Check if already submitted from local storage
  useEffect(() => {
    if (paperId && isSurveyCompleted(paperId)) {
      setIsSubmitted(true);
    } else {
      setIsSubmitted(false);
    }
  }, [paperId, isSurveyCompleted]);

  // Fetch paper data
  useEffect(() => {
    const fetchPaperData = async () => {
      try {
        const response = await fetch(`/api/v1/papers/${paperId}`);
        const data = await response.json();
        if (data.success) {
          setSurveyCount(data.data.survey_count || 0);
        }
      } catch (error) {
        console.error('Error fetching paper data:', error);
      }
    };

    if (paperId) {
      fetchPaperData();
      setAnswers({});
      setRecommendations([]);
    }
  }, [paperId]);

  // Fetch survey questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/v1/survey-questions');
        const data = await response.json();
        if (data.success) {
          setQuestions(data.data.questions);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestions();
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleProfileChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = () => {
    updateProfile(profileForm);
    setShowProfile(false);
  };

  const fetchRecommendations = useCallback(async () => {
    if (!sessionId) return;

    setIsLoadingRecs(true);
    try {
      // Trigger the survey_complete skill via chat API
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'survey_submitted',
          paperId,
          sessionId,
          type: 'hook',
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.recommendedPapers) {
                setRecommendations(parsed.recommendedPapers);
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoadingRecs(false);
    }
  }, [paperId, sessionId]);

  const handleSubmit = async () => {
    if (!sessionId) return;

    // Check if all questions are answered
    const allAnswered = questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      alert('모든 질문에 답변해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/papers/${paperId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          responses: Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value,
          })),
          // Include user profile if available
          userProfile: hasProfile ? profileForm : undefined,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setSurveyCount((prev) => prev + 1);
        // Save to local storage
        markSurveyCompleted(paperId);
        // Notify parent for statistics
        onSurveyComplete?.();
        // Fetch recommendations after successful submission
        fetchRecommendations();
      }
    } catch (error) {
      console.error('Survey submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-80 shrink-0 border-l bg-sidebar hidden xl:block overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* 사용자 프로필 섹션 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-sm font-medium flex items-center justify-between cursor-pointer"
                onClick={() => setShowProfile(!showProfile)}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  내 정보
                  {hasProfile && (
                    <Badge variant="secondary" className="text-xs">
                      저장됨
                    </Badge>
                  )}
                </div>
                {showProfile ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
            {showProfile && (
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">이름</Label>
                  <Input
                    id="name"
                    placeholder="홍길동"
                    value={profileForm.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={profileForm.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">전화번호</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="010-1234-5678"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="affiliation" className="text-xs">소속</Label>
                  <Input
                    id="affiliation"
                    placeholder="회사/학교/기관"
                    value={profileForm.affiliation}
                    onChange={(e) => handleProfileChange('affiliation', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={saveProfile}>
                  저장 (브라우저에 보관)
                </Button>
                <p className="text-xs text-muted-foreground">
                  * 정보는 브라우저에만 저장되며 설문 제출 시 함께 전송됩니다.
                </p>
              </CardContent>
            )}
          </Card>

          <Separator />

          {/* 설문 완료 상태 */}
          {isSubmitted ? (
            <Card className="border-green-500/50 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <PartyPopper className="h-4 w-4" />
                  설문 완료
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  설문에 참여해 주셔서 감사합니다!
                </p>

                {/* 추천 논문 */}
                {isLoadingRecs ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      추천 논문 찾는 중...
                    </span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      관심사 기반 추천 논문
                    </div>
                    {recommendations.slice(0, 3).map((paper) => (
                      <Card
                        key={paper.id}
                        className="p-2 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => onPaperSelect?.(paper.id)}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium line-clamp-2">
                              {paper.title}
                            </p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {paper.reason}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            /* 설문 섹션 */
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  설문
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    설문 질문을 불러오는 중...
                  </p>
                ) : (
                  questions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      <Label className="text-sm">
                        Q{index + 1}. {question.question_text}
                      </Label>
                      <div className="space-y-1">
                        {(question.options || []).map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                          >
                            <input
                              type="radio"
                              name={`q-${question.id}`}
                              value={option.value}
                              checked={answers[question.id] === option.value}
                              onChange={(e) =>
                                handleAnswerChange(question.id, e.target.value)
                              }
                              className="accent-primary"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting || questions.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      제출 중...
                    </>
                  ) : (
                    '설문 제출'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 통계 */}
          <div className="text-xs text-muted-foreground text-center">
            총 {surveyCount}명이 설문에 참여했습니다
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
