import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ScatterChart,
  Scatter,
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
import type { BehaviorData } from './page';

interface Props {
  data: BehaviorData | null;
  loading: boolean;
  error: string | null;
}

const CLUSTER_COLORS: Record<string, string> = {
  power_user: '#8b5cf6',
  survey_champion: '#22c55e',
  deep_reader: '#6366f1',
  skimmer: '#f59e0b',
  drive_by: '#94a3b8',
  uncategorized: '#d1d5db',
};

const PIE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#eab308', '#ec4899', '#14b8a6'];

export default function UserBehaviorTab({ data, loading, error }: Props) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const scatterByCluster = useMemo(() => {
    if (!data) return {};
    const grouped: Record<string, Array<{ papers_read: number; avg_time_per_paper: number; surveys_completed: number }>> = {};
    for (const point of data.scatter_data) {
      if (!grouped[point.cluster]) grouped[point.cluster] = [];
      grouped[point.cluster].push({
        papers_read: point.papers_read,
        avg_time_per_paper: Math.round(point.avg_time_per_paper),
        surveys_completed: point.surveys_completed,
      });
    }
    return grouped;
  }, [data]);

  const orgPieData = useMemo(() => {
    if (!data) return [];
    const clusterKey = selectedCluster ?? 'power_user';
    const demo = data.demographics[clusterKey];
    if (!demo) return [];
    return Object.entries(demo.organization)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedCluster]);

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
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

  return (
    <div className="space-y-6 mt-4">
      {/* Cluster summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {data.clusters.map((cluster) => {
          const color = CLUSTER_COLORS[cluster.name] ?? '#94a3b8';
          return (
            <Card
              key={cluster.name}
              className="cursor-pointer transition-shadow hover:shadow-md"
              style={{ borderLeft: `4px solid ${color}` }}
              onClick={() => setSelectedCluster(cluster.name)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {cluster.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cluster.count}</div>
                <p className="text-xs text-muted-foreground">
                  전체의 {cluster.percentage}%
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">
                      {cluster.avg_metrics.papers_read}
                    </span>{' '}
                    논문/인
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {Math.round(cluster.avg_metrics.avg_time_per_paper)}s
                    </span>{' '}
                    평균 읽기
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {cluster.avg_metrics.avg_scroll_depth.toFixed(0)}%
                    </span>{' '}
                    스크롤
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {(cluster.avg_metrics.survey_rate * 100).toFixed(1)}%
                    </span>{' '}
                    설문율
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Scatter Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            사용자 클러스터 분포 (논문 수 vs 평균 읽기 시간)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="papers_read"
                name="논문 읽기 수"
                tick={{ fontSize: 11 }}
                label={{ value: '논문 읽기 수', position: 'bottom', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="avg_time_per_paper"
                name="평균 읽기 시간(초)"
                tick={{ fontSize: 11 }}
                label={{ value: '평균 읽기 시간(초)', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: number, name: string) => {
                  if (name === '논문 읽기 수') return [value, '논문 수'];
                  if (name === '평균 읽기 시간(초)') return [`${value}초`, '평균 읽기 시간'];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(scatterByCluster).map(([clusterName, points]) => (
                <Scatter
                  key={clusterName}
                  name={
                    data.clusters.find((c) => c.name === clusterName)?.label ?? clusterName
                  }
                  data={points}
                  fill={CLUSTER_COLORS[clusterName] ?? '#94a3b8'}
                  opacity={0.7}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Demographics PieChart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            클러스터별 소속 분포
            {selectedCluster && (
              <span className="text-muted-foreground font-normal ml-2">
                - {data.clusters.find((c) => c.name === selectedCluster)?.label ?? selectedCluster}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.clusters.map((cluster) => (
              <button
                key={cluster.name}
                onClick={() => setSelectedCluster(cluster.name)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedCluster === cluster.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                {cluster.label}
              </button>
            ))}
          </div>
          {orgPieData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              소속 데이터 없음
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orgPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name.length > 10 ? name.slice(0, 9) + '\u2026' : name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {orgPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, '응답 수']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
