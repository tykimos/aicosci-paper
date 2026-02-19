'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// ---- Types ----

interface Paper {
  id: string;
  title: string;
}

interface SurveyRow {
  id: string;
  paper_id: string;
  paper_title: string;
  responses: Array<{ questionId: string; value: string }>;
  created_at: string;
}

interface AggregateData {
  total_surveys: number;
  today_surveys: number;
  distributions: { [questionId: string]: { [value: string]: number } };
  matrix_distributions: { [item: string]: { [scale: string]: number } };
  text_responses: { 'q3-1': string[]; 'q3-2': string[]; 'q3-4': string[] };
}

// ---- Helpers ----

function getResponseValue(
  responses: Array<{ questionId: string; value: string }>,
  qId: string,
): string {
  return responses?.find((r) => r.questionId === qId)?.value || '';
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];

function distToBarData(dist: { [v: string]: number } | undefined): { name: string; count: number }[] {
  if (!dist) return [];
  return Object.entries(dist)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));
}

function distToPieData(dist: { [v: string]: number } | undefined): { name: string; value: number }[] {
  if (!dist) return [];
  return Object.entries(dist).map(([name, value]) => ({ name, value }));
}

// ---- Sub-components ----

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold">{value.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({
  title,
  data,
}: {
  title: string;
  data: { name: string; count: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">데이터 없음</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function HorizontalBarChart({
  title,
  data,
}: {
  title: string;
  data: { name: string; count: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">데이터 없음</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
            <BarChart layout="vertical" data={data} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function SimplePieChart({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">데이터 없음</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Survey Detail Dialog ----

function SurveyDetailDialog({
  survey,
  onClose,
}: {
  survey: SurveyRow | null;
  onClose: () => void;
}) {
  if (!survey) return null;
  const r = survey.responses;

  const matrixItems: { id: string; label: string }[] = [
    { id: 'q2-2-accuracy', label: '정확성' },
    { id: 'q2-2-clarity', label: '명확성' },
    { id: 'q2-2-novelty', label: '새로움' },
    { id: 'q2-2-applicability', label: '적용 가능성' },
    { id: 'q2-2-completeness', label: '완결성' },
  ];

  function field(label: string, value: string) {
    return (
      <div className="flex gap-2 text-sm">
        <span className="text-muted-foreground min-w-[120px] shrink-0">{label}</span>
        <span className="font-medium">{value || '-'}</span>
      </div>
    );
  }

  return (
    <Dialog open={!!survey} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{survey.paper_title}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(survey.created_at)}</p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section 1 — 개인정보</h3>
            <div className="space-y-1.5 pl-1">
              {field('출생연도', getResponseValue(r, 'q1-birthYear'))}
              {field('소속', getResponseValue(r, 'q1-organization'))}
              {field('소속 유형', getResponseValue(r, 'q1-1'))}
              {field('연구 빈도', getResponseValue(r, 'q1-2'))}
            </div>
          </div>

          <Separator />

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section 2 — 연구보고서 평가</h3>
            <div className="space-y-1.5 pl-1">
              {field('전반적 평가 (q2-1)', getResponseValue(r, 'q2-1'))}
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">세부 평가 (q2-2 매트릭스)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                  {matrixItems.map((item) => (
                    <div key={item.id} className="flex gap-1">
                      <span className="text-muted-foreground text-xs min-w-[80px]">{item.label}</span>
                      <span className="text-xs font-medium">{getResponseValue(r, item.id) || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
              {field('공개 가치 (q2-3)', getResponseValue(r, 'q2-3'))}
              {field('사회 기여 (q2-4)', getResponseValue(r, 'q2-4'))}
              {field('추천 의향 (q2-5)', getResponseValue(r, 'q2-5'))}
            </div>
          </div>

          <Separator />

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section 3 — 기타 의견</h3>
            <div className="space-y-2 pl-1">
              <div className="text-sm">
                <p className="text-muted-foreground text-xs mb-0.5">인상 깊은 점 (q3-1)</p>
                <p className="text-sm whitespace-pre-wrap">{getResponseValue(r, 'q3-1') || '-'}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground text-xs mb-0.5">개선점 (q3-2)</p>
                <p className="text-sm whitespace-pre-wrap">{getResponseValue(r, 'q3-2') || '-'}</p>
              </div>
              {field('개선 희망 항목 (q3-3)', getResponseValue(r, 'q3-3'))}
              <div className="text-sm">
                <p className="text-muted-foreground text-xs mb-0.5">자유 의견 (q3-4)</p>
                <p className="text-sm whitespace-pre-wrap">{getResponseValue(r, 'q3-4') || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Tab 1: 응답 목록 ----

function ResponseListTab() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyRow | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch('/api/v1/papers?limit=200')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPapers(data.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    const qs = selectedPaperId ? `?paper_id=${selectedPaperId}` : '';
    fetch(`/api/v1/admin/surveys/aggregate${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTotalCount(data.data.total_surveys ?? 0);
          setTodayCount(data.data.today_surveys ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [selectedPaperId]);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (selectedPaperId) params.set('paper_id', selectedPaperId);
      const res = await fetch(`/api/v1/admin/surveys?${params}`);
      const data = await res.json();
      if (data.success) {
        setSurveys(data.data || []);
        const total = data.total ?? 0;
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, selectedPaperId]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="총 설문 응답" value={totalCount} loading={statsLoading} />
        <StatCard label="오늘 응답" value={todayCount} loading={statsLoading} />
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">논문 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedPaperId}
            onChange={(e) => { setSelectedPaperId(e.target.value); setPage(1); }}
          >
            <option value="">전체 논문</option>
            {papers.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>논문 제목</TableHead>
                <TableHead>소속</TableHead>
                <TableHead className="text-center w-24">전반 평가</TableHead>
                <TableHead className="text-center w-20">추천</TableHead>
                <TableHead className="w-40">응답 일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : surveys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    설문 응답이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                surveys.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSurvey(s)}
                  >
                    <TableCell className="max-w-[240px] truncate font-medium text-sm">
                      {s.paper_title || '(제목 없음)'}
                    </TableCell>
                    <TableCell className="text-sm">{getResponseValue(s.responses, 'q1-organization') || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{getResponseValue(s.responses, 'q2-1') || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{getResponseValue(s.responses, 'q2-5') || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            다음
          </Button>
        </div>
      )}

      <SurveyDetailDialog survey={selectedSurvey} onClose={() => setSelectedSurvey(null)} />
    </div>
  );
}

// ---- Tab 2: 통계 분석 ----

function StatsAnalysisTab() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [agg, setAgg] = useState<AggregateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/papers?limit=200')
      .then((r) => r.json())
      .then((data) => { if (data.success) setPapers(data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = selectedPaperId ? `?paper_id=${selectedPaperId}` : '';
    fetch(`/api/v1/admin/surveys/aggregate${qs}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setAgg(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedPaperId]);

  const dist = agg?.distributions ?? {};
  const textResponses = agg?.text_responses ?? { 'q3-1': [], 'q3-2': [], 'q3-4': [] };

  return (
    <div className="space-y-4">
      {/* Paper filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">논문 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
          >
            <option value="">전체 논문</option>
            {papers.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Row 1: q2-1, q2-5 */}
          <div className="grid gap-4 md:grid-cols-2">
            <SimpleBarChart
              title="q2-1 전반적 평가 분포"
              data={distToBarData(dist['q2-1'])}
            />
            <SimpleBarChart
              title="q2-5 추천 의향 분포"
              data={distToBarData(dist['q2-5'])}
            />
          </div>

          {/* Row 2: q2-3, q2-4 */}
          <div className="grid gap-4 md:grid-cols-2">
            <SimpleBarChart
              title="q2-3 공개 가치 분포"
              data={distToBarData(dist['q2-3'])}
            />
            <SimpleBarChart
              title="q2-4 사회 기여 분포"
              data={distToBarData(dist['q2-4'])}
            />
          </div>

          {/* Row 3: q1-organization (Pie), q1-2 (Pie) */}
          <div className="grid gap-4 md:grid-cols-2">
            <SimplePieChart
              title="q1-organization 소속 분포"
              data={distToPieData(dist['q1-organization'])}
            />
            <SimplePieChart
              title="q1-2 연구 빈도 분포"
              data={distToPieData(dist['q1-2'])}
            />
          </div>

          {/* Row 4: q3-3 개선 희망 (horizontal) */}
          <HorizontalBarChart
            title="q3-3 개선 희망 항목 분포"
            data={distToBarData(dist['q3-3'])}
          />

          {/* Row 5: q3-1 텍스트 응답 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">q3-1 인상 깊은 점 (최신순)</CardTitle>
            </CardHeader>
            <CardContent>
              {(!textResponses['q3-1'] || textResponses['q3-1'].length === 0) ? (
                <p className="text-sm text-muted-foreground">응답 없음</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {[...textResponses['q3-1']].reverse().map((text, i) => (
                    <div key={i} className="text-sm p-2 bg-muted rounded-md">
                      {text}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function AdminSurveysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설문 결과</h1>
        <p className="text-muted-foreground">설문 응답을 확인하고 분석합니다.</p>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">응답 목록</TabsTrigger>
          <TabsTrigger value="stats">통계 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ResponseListTab />
        </TabsContent>

        <TabsContent value="stats">
          <StatsAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
