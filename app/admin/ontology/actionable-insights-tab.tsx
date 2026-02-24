import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { InsightsData } from './page';

interface Props {
  data: InsightsData | null;
  loading: boolean;
  error: string | null;
}

const SEVERITY_BORDER_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '긴급',
  warning: '경고',
  info: '정보',
};

export default function ActionableInsightsTab({ data, loading, error }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!data) return [];
    const cats = new Set<string>();
    for (const insight of data.insights) {
      cats.add(insight.category);
    }
    return Array.from(cats).sort();
  }, [data]);

  const filteredInsights = useMemo(() => {
    if (!data) return [];
    if (!categoryFilter) return data.insights;
    return data.insights.filter((i) => i.category === categoryFilter);
  }, [data, categoryFilter]);

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 flex justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-4 flex justify-center">
        <p className="text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  const kpiCards = [
    { label: '총 논문', value: data.kpis.total_papers, format: 'number' as const },
    { label: '총 세션', value: data.kpis.total_sessions, format: 'number' as const },
    { label: '총 설문', value: data.kpis.total_surveys, format: 'number' as const },
    { label: '설문 전환율', value: data.kpis.survey_conversion_rate, format: 'percent' as const },
    { label: '평균 평점', value: data.kpis.avg_rating, format: 'decimal' as const },
    { label: '숨겨진 명작', value: data.kpis.hidden_gem_count, format: 'number' as const },
    { label: '이상 세션', value: data.kpis.anomaly_session_count, format: 'number' as const },
    { label: '드라이브바이 비율', value: data.kpis.drive_by_percentage, format: 'percent' as const },
  ];

  const formatValue = (value: number, format: 'number' | 'percent' | 'decimal') => {
    if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
    if (format === 'decimal') return value.toFixed(2);
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {kpi.label}
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatValue(kpi.value, kpi.format)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(null)}
          >
            전체
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Insight cards */}
      {filteredInsights.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            인사이트가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => {
            const borderColor =
              SEVERITY_BORDER_COLORS[insight.severity] ?? '#3b82f6';

            return (
              <Card
                key={insight.id}
                style={{ borderLeft: `4px solid ${borderColor}` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-medium flex-1">
                      {insight.title}
                    </CardTitle>
                    <Badge
                      className="border-0 text-xs"
                      style={{
                        backgroundColor: `${borderColor}20`,
                        color: borderColor,
                      }}
                    >
                      {SEVERITY_LABELS[insight.severity] ?? insight.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {insight.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="text-lg font-bold">{insight.metric_value}</div>
                    {insight.action_label && (
                      <Badge variant="secondary" className="text-xs">
                        {insight.action_label}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
