'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardList,
  PartyPopper,
  Sparkles,
  FileText,
  Loader2,
  User,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useUserProfile, useCompletedSurveys } from '@/hooks/use-local-storage';
import type { Paper } from '@/types/database';

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

// 2-2 매트릭스 평가 항목
const MATRIX_ITEMS = [
  '주제가 흥미롭다',
  '사회적·현실적 의미가 있다',
  '내용이 비교적 이해하기 쉬웠다',
  '문제 제기와 접근 방식이 타당하다',
  '결론이 설득력 있다',
] as const;

const MATRIX_SCALES = ['매우 그렇다', '그렇다', '보통', '아니다', '전혀 아니다'] as const;

// 3-3 복수 선택 옵션
const IMPROVEMENT_OPTIONS = [
  '설명이 더 쉬웠으면 좋겠다',
  '사례나 예시가 더 많았으면 좋겠다',
  '분량이 더 간결했으면 좋겠다',
  '그림·표 등 시각 자료가 부족하다',
  '현재 수준으로도 충분하다',
  '기타',
] as const;

export function SurveySidebar({ paperId, sessionId, onPaperSelect, onSurveyComplete }: SurveySidebarProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [matrixAnswers, setMatrixAnswers] = useState<Record<string, string>>({});
  const [checkboxAnswers, setCheckboxAnswers] = useState<Record<string, boolean>>({});
  const [improvementOther, setImprovementOther] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedPaper[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [surveyCount, setSurveyCount] = useState(0);

  // Local storage hooks
  const { profile, updateProfile, hasProfile } = useUserProfile();
  const { markSurveyCompleted, isSurveyCompleted } = useCompletedSurveys();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    birthYear: String(new Date().getFullYear() - 25),
    organization: '',
    organizationOther: '',
    affiliationType: '',
    researchFrequency: '',
  });

  // Sync profile form with stored profile
  useEffect(() => {
    setProfileForm({
      birthYear: profile.birthYear || String(new Date().getFullYear() - 25),
      organization: profile.organization,
      organizationOther: profile.organizationOther,
      affiliationType: profile.affiliationType,
      researchFrequency: profile.researchFrequency,
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
      setMatrixAnswers({});
      setCheckboxAnswers({});
      setImprovementOther('');
      setRecommendations([]);
    }
  }, [paperId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMatrixChange = (item: string, scale: string) => {
    setMatrixAnswers((prev) => ({ ...prev, [item]: scale }));
  };

  const handleCheckboxChange = (option: string, checked: boolean) => {
    setCheckboxAnswers((prev) => ({ ...prev, [option]: checked }));
  };

  const handleProfileChange = (field: keyof typeof profileForm, value: string) => {
    const updated = { ...profileForm, [field]: value };
    setProfileForm(updated);
    updateProfile(updated);
  };

  const fetchRecommendations = useCallback(async () => {
    if (!sessionId) return;

    setIsLoadingRecs(true);
    try {
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

    // 필수 항목 체크: 2-1
    if (!answers['q2-1']) {
      alert('2-1. 전반적인 평가를 선택해주세요.');
      return;
    }

    // 필수 항목 체크: 2-2 매트릭스 전부
    const allMatrixAnswered = MATRIX_ITEMS.every((item) => matrixAnswers[item]);
    if (!allMatrixAnswered) {
      alert('2-2. 모든 평가 항목에 답변해주세요.');
      return;
    }

    // 필수 항목 체크: 2-3, 2-4, 2-5
    if (!answers['q2-3'] || !answers['q2-4'] || !answers['q2-5']) {
      alert('2-3 ~ 2-5 문항에 모두 답변해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build all responses
      const selectedImprovements = Object.entries(checkboxAnswers)
        .filter(([, checked]) => checked)
        .map(([option]) => option);
      if (checkboxAnswers['기타'] && improvementOther.trim()) {
        const idx = selectedImprovements.indexOf('기타');
        if (idx !== -1) {
          selectedImprovements[idx] = `기타: ${improvementOther.trim()}`;
        }
      }

      const responses = [
        { questionId: 'q2-1', value: answers['q2-1'] },
        { questionId: 'q2-2', value: JSON.stringify(matrixAnswers) },
        { questionId: 'q2-3', value: answers['q2-3'] },
        { questionId: 'q2-4', value: answers['q2-4'] },
        { questionId: 'q2-5', value: answers['q2-5'] },
        { questionId: 'q3-1', value: answers['q3-1'] || '' },
        { questionId: 'q3-2', value: answers['q3-2'] || '' },
        { questionId: 'q3-3', value: JSON.stringify(selectedImprovements) },
        { questionId: 'q3-4', value: answers['q3-4'] || '' },
      ];

      const response = await fetch(`/api/v1/papers/${paperId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          responses,
          userProfile: hasProfile ? profileForm : undefined,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setSurveyCount((prev) => prev + 1);
        markSurveyCompleted(paperId);
        onSurveyComplete?.();
        fetchRecommendations();
      }
    } catch (error) {
      console.error('Survey submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 라디오 질문 렌더링 헬퍼
  const renderRadioQuestion = (id: string, label: string, options: readonly string[]) => (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="space-y-1">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
          >
            <input
              type="radio"
              name={id}
              value={option}
              checked={answers[id] === option}
              onChange={(e) => handleAnswerChange(id, e.target.value)}
              className="accent-primary"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <aside className="w-80 shrink-0 border-l bg-sidebar hidden xl:block overflow-y-auto h-full">
        <div className="p-4 space-y-4">
          {/* 1. 개인 설문 섹션 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                1. 개인에 대한 설문
                {hasProfile && (
                  <Badge variant="secondary" className="text-xs">
                    저장됨
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">생년</Label>
                <select
                  value={profileForm.birthYear}
                  onChange={(e) => handleProfileChange('birthYear', e.target.value)}
                  className="w-full h-8 text-sm rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={String(year)}>
                      {year}년
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">소속</Label>
                <div className="space-y-1">
                  {[
                    '대학',
                    '출연(연)',
                    '기업',
                    '기타 비영리',
                    '기타',
                  ].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                    >
                      <input
                        type="radio"
                        name="organization"
                        value={option}
                        checked={profileForm.organization === option}
                        onChange={(e) => handleProfileChange('organization', e.target.value)}
                        className="accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {profileForm.organization === '기타' && (
                  <Input
                    placeholder="소속을 입력해주세요"
                    value={profileForm.organizationOther}
                    onChange={(e) => handleProfileChange('organizationOther', e.target.value)}
                    className="h-8 text-sm mt-1"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">
                  1-1. 귀하의 소속 또는 현재 상황을 선택해주세요.
                </Label>
                <div className="space-y-1">
                  {[
                    '일반 국민',
                    '대학생',
                    '대학원생',
                    '연구자 / 교수 / 연구원',
                    '산업계 종사자',
                    '기타',
                  ].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                    >
                      <input
                        type="radio"
                        name="affiliationType"
                        value={option}
                        checked={profileForm.affiliationType === option}
                        onChange={(e) => handleProfileChange('affiliationType', e.target.value)}
                        className="accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">
                  1-2. 평소 논문이나 연구 자료를 접하는 빈도는 어느 정도인가요?
                </Label>
                <div className="space-y-1">
                  {[
                    '거의 접하지 않음',
                    '가끔 접함',
                    '필요할 때 종종 접함',
                    '자주 접함',
                  ].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                    >
                      <input
                        type="radio"
                        name="researchFrequency"
                        value={option}
                        checked={profileForm.researchFrequency === option}
                        onChange={(e) => handleProfileChange('researchFrequency', e.target.value)}
                        className="accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                * 선택 시 자동 저장되며 설문 제출 시 함께 전송됩니다.
              </p>
            </CardContent>
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

                {/* 추천 연구보고서 */}
                {isLoadingRecs ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      추천 연구보고서 찾는 중...
                    </span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      관심사 기반 추천 연구보고서
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
            <>
              {/* 2. 연구보고서에 대한 설문 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    2. 연구보고서에 대한 설문
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    ※ 아래 문항은 직접 확인한 연구보고서에 대해서만 응답해주세요.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* 2-1 */}
                  {renderRadioQuestion(
                    'q2-1',
                    '2-1. 해당 연구보고서에 대한 전반적인 평가는 어떠했나요?',
                    ['매우 우수함', '우수함', '보통', '다소 미흡', '매우 미흡']
                  )}

                  {/* 2-2 매트릭스 */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      2-2. 아래 항목별로 느끼신 정도를 선택해주세요.
                    </Label>
                    <div className="space-y-3">
                      {MATRIX_ITEMS.map((item) => (
                        <div key={item} className="space-y-1">
                          <p className="text-xs font-medium text-foreground/80">{item}</p>
                          <div className="flex flex-wrap gap-1">
                            {MATRIX_SCALES.map((scale) => (
                              <button
                                key={scale}
                                type="button"
                                onClick={() => handleMatrixChange(item, scale)}
                                className={`text-xs cursor-pointer border rounded px-2 py-1 transition-colors ${
                                  matrixAnswers[item] === scale
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'hover:bg-accent border-input'
                                }`}
                              >
                                {scale}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2-3 */}
                  {renderRadioQuestion(
                    'q2-3',
                    '2-3. 이 연구보고서는 일반 국민에게도 공개할 가치가 있다고 생각하시나요?',
                    ['매우 그렇다', '어느 정도 그렇다', '보통이다', '별로 그렇지 않다', '전혀 그렇지 않다']
                  )}

                  {/* 2-4 */}
                  {renderRadioQuestion(
                    'q2-4',
                    '2-4. 이 연구보고서가 실제 사회·정책·기술 발전에 기여할 수 있다고 보시나요?',
                    ['매우 높다', '어느 정도 있다', '잘 모르겠다', '낮다', '매우 낮다']
                  )}

                  {/* 2-5 */}
                  {renderRadioQuestion(
                    'q2-5',
                    '2-5. 이 연구보고서를 다른 사람에게 추천하고 싶으신가요?',
                    ['적극 추천', '추천할 만함', '보통', '추천하지 않음']
                  )}
                </CardContent>
              </Card>

              {/* 3. 기타 의견 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    3. 기타 의견
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* 3-1 */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      3-1. 해당 연구보고서에서 가장 인상 깊었던 점은 무엇이었나요?
                    </Label>
                    <Textarea
                      placeholder="자유롭게 작성해주세요"
                      value={answers['q3-1'] || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAnswerChange('q3-1', e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  {/* 3-2 */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      3-2. 이해하기 어려웠거나 개선이 필요하다고 느낀 점이 있다면 적어주세요.
                    </Label>
                    <Textarea
                      placeholder="선택 사항입니다"
                      value={answers['q3-2'] || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAnswerChange('q3-2', e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  {/* 3-3 복수 선택 */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      3-3. 일반 국민의 관점에서 연구보고서가 더 좋아지기 위해 보완되면 좋을 점을 선택해주세요. (복수 선택 가능)
                    </Label>
                    <div className="space-y-1">
                      {IMPROVEMENT_OPTIONS.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                        >
                          <input
                            type="checkbox"
                            checked={checkboxAnswers[option] || false}
                            onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                            className="accent-primary"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {checkboxAnswers['기타'] && (
                      <Input
                        placeholder="기타 의견을 입력해주세요"
                        value={improvementOther}
                        onChange={(e) => setImprovementOther(e.target.value)}
                        className="h-8 text-sm mt-1"
                      />
                    )}
                  </div>

                  {/* 3-4 */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      3-4. 전체적으로 이번 연구보고서 공개 및 대국민 리뷰 방식에 대한 의견이 있다면 자유롭게 작성해주세요.
                    </Label>
                    <Textarea
                      placeholder="선택 사항입니다"
                      value={answers['q3-4'] || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAnswerChange('q3-4', e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
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
            </>
          )}

          {/* 통계 */}
          <div className="text-xs text-muted-foreground text-center">
            총 {surveyCount}명이 설문에 참여했습니다
          </div>
        </div>
    </aside>
  );
}
