'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ---- Types ----

interface AdminMe {
  email: string;
  name: string;
  role: string;
  last_login_at: string;
}

interface SysStats {
  total_papers: number;
  total_reads: number;
  total_surveys: number;
  total_participants: number;
}

// ---- Survey schema ----

const SURVEY_SCHEMA = [
  {
    section: 'Section 1 — 개인 설문',
    questions: [
      { id: 'q1-birthYear', label: '출생 연도', type: 'select' },
      { id: 'q1-organization', label: '소속', type: 'radio' },
      { id: 'q1-1', label: '소속 유형', type: 'radio' },
      { id: 'q1-2', label: '연구 빈도', type: 'radio' },
    ],
  },
  {
    section: 'Section 2 — 연구보고서 평가',
    questions: [
      { id: 'q2-1', label: '전반적 평가', type: '5점 척도 (radio)' },
      { id: 'q2-2', label: '세부 평가 (정확성/명확성/새로움/적용가능성/완결성)', type: '매트릭스 5항목 × 5척도' },
      { id: 'q2-3', label: '공개 가치', type: '5점 척도 (radio)' },
      { id: 'q2-4', label: '사회 기여', type: '5점 척도 (radio)' },
      { id: 'q2-5', label: '추천 의향', type: '4점 척도 (radio)' },
    ],
  },
  {
    section: 'Section 3 — 기타 의견',
    questions: [
      { id: 'q3-1', label: '인상 깊은 점', type: 'text (자유 서술)' },
      { id: 'q3-2', label: '개선점', type: 'text (자유 서술)' },
      { id: 'q3-3', label: '개선 희망 항목', type: 'checkbox (복수 선택)' },
      { id: 'q3-4', label: '자유 의견', type: 'text (자유 서술)' },
    ],
  },
];

// ---- Helpers ----

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ---- Main Page ----

export default function AdminSettingsPage() {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [stats, setStats] = useState<SysStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/me')
      .then((r) => r.json())
      .then((data) => { if (data.success) setMe(data.data); })
      .catch(() => {})
      .finally(() => setMeLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/v1/admin/stats')
      .then((r) => r.json())
      .then((data) => { if (data.success) setStats(data.data); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground">관리자 정보 및 시스템 현황을 확인합니다.</p>
      </div>

      {/* Card: 내 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">내 정보</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {meLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : me ? (
            <>
              <InfoRow label="이메일" value={me.email} />
              <InfoRow label="이름" value={me.name} />
              <InfoRow
                label="역할"
                value={me.role}
              />
              <InfoRow label="마지막 로그인" value={formatDate(me.last_login_at)} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">정보를 불러올 수 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* Card: 설문 문항 구조 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">현재 설문 문항 구조</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {SURVEY_SCHEMA.map((section, si) => (
            <div key={si}>
              {si > 0 && <Separator className="mb-4" />}
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {section.section}
              </h3>
              <div className="space-y-2">
                {section.questions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-2.5 rounded-md border bg-muted/30"
                  >
                    <code className="text-xs font-mono bg-background border rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                      {q.id}
                    </code>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{q.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Card: 시스템 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">시스템 정보</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {statsLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : stats ? (
            <>
              <InfoRow label="총 논문 수" value={stats.total_papers.toLocaleString()} />
              <InfoRow label="총 논문 읽기" value={stats.total_reads.toLocaleString()} />
              <InfoRow label="총 설문 응답" value={stats.total_surveys.toLocaleString()} />
              <InfoRow label="총 참여자 수" value={stats.total_participants.toLocaleString()} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">정보를 불러올 수 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
