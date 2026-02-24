import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { QualityMatrixData } from './page';

interface Props {
  data: QualityMatrixData | null;
  loading: boolean;
  error: string | null;
}

const QUADRANT_COLORS: Record<string, string> = {
  star: '#22c55e',
  hidden_gem: '#6366f1',
  popular_questionable: '#f59e0b',
  needs_attention: '#ef4444',
};

const QUADRANT_LABELS: Record<string, string> = {
  star: '\u2B50 \uC2A4\uD0C0',
  hidden_gem: '\uD83D\uDC8E \uC228\uACE8 \uBA85\uC791',
  popular_questionable: '\u26A0 \uC778\uAE30 \uD488\uC9C8 \uBD88\uC77C\uCE58',
  needs_attention: '\uD83D\uDEA8 \uAC1C\uC120 \uD544\uC694',
};

interface ScatterPoint {
  title: string;
  engagement_score: number;
  quality_score: number;
  quadrant: string;
}

// Custom tooltip for scatter
function QuadrantTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-md text-sm max-w-[250px]">
      <p className="font-medium truncate">{point.title}</p>
      <p className="text-muted-foreground">
        참여도: {point.engagement_score.toFixed(3)}
      </p>
      <p className="text-muted-foreground">
        품질: {point.quality_score.toFixed(3)}
      </p>
      <p style={{ color: QUADRANT_COLORS[point.quadrant] }}>
        {QUADRANT_LABELS[point.quadrant] ?? point.quadrant}
      </p>
    </div>
  );
}

export default function QualityMatrixTab({ data, loading, error }: Props) {
  const scatterData = useMemo(() => {
    if (!data) return [];
    return data.papers
      .filter((p) => p.quality_score !== null && p.quadrant !== null)
      .map((p) => ({
        title: p.title,
        engagement_score: p.engagement_score,
        quality_score: p.quality_score as number,
        quadrant: p.quadrant as string,
      }));
  }, [data]);

  const scatterByQuadrant = useMemo(() => {
    const grouped: Record<string, ScatterPoint[]> = {};
    for (const point of scatterData) {
      if (!grouped[point.quadrant]) grouped[point.quadrant] = [];
      grouped[point.quadrant].push(point);
    }
    return grouped;
  }, [scatterData]);

  // Correlation data (reading time vs rating)
  const correlationDisplay = useMemo(() => {
    if (!data) return null;
    const c = data.correlation.reading_time_vs_rating;
    return { r: c.r, n: c.n };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
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
      {/* Quadrant ScatterChart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            품질-참여 사분면
            <span className="text-muted-foreground font-normal ml-2">
              (중앙값: 품질 {data.medians.quality.toFixed(3)}, 참여 {data.medians.engagement.toFixed(3)})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scatterData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              품질 점수가 계산된 논문이 없습니다 (최소 3개 설문 필요)
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={450}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  dataKey="engagement_score"
                  name="참여도"
                  tick={{ fontSize: 11 }}
                  label={{ value: '참여도 점수', position: 'bottom', fontSize: 12 }}
                  domain={[0, 'auto']}
                />
                <YAxis
                  type="number"
                  dataKey="quality_score"
                  name="품질"
                  tick={{ fontSize: 11 }}
                  label={{ value: '품질 점수', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  domain={[0, 'auto']}
                />
                <ReferenceLine
                  x={data.medians.engagement}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                />
                <ReferenceLine
                  y={data.medians.quality}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                />
                <Tooltip content={<QuadrantTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(scatterByQuadrant).map(([quadrant, points]) => (
                  <Scatter
                    key={quadrant}
                    name={QUADRANT_LABELS[quadrant] ?? quadrant}
                    data={points}
                    fill={QUADRANT_COLORS[quadrant] ?? '#94a3b8'}
                  >
                    {points.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={QUADRANT_COLORS[quadrant] ?? '#94a3b8'}
                        opacity={0.7}
                      />
                    ))}
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Hidden Gems Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            숨겨진 명작 ({data.hidden_gems.length}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.hidden_gems.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">숨겨진 명작 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>논문 제목</TableHead>
                    <TableHead className="text-right">품질 점수</TableHead>
                    <TableHead className="text-right">참여 점수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.hidden_gems.map((gem) => (
                    <TableRow key={gem.id}>
                      <TableCell className="max-w-[300px] truncate" title={gem.title}>
                        {gem.title}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">{gem.quality_score.toFixed(3)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {gem.engagement_score.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Correlation Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">읽기 시간 vs 평점 상관관계</CardTitle>
        </CardHeader>
        <CardContent>
          {correlationDisplay ? (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {correlationDisplay.r.toFixed(4)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  피어슨 상관계수 (r)
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {correlationDisplay.n.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-1">데이터 포인트 수 (n)</p>
              </div>
              <div className="text-sm text-muted-foreground flex-1">
                {Math.abs(correlationDisplay.r) < 0.1 && '거의 상관 없음'}
                {Math.abs(correlationDisplay.r) >= 0.1 &&
                  Math.abs(correlationDisplay.r) < 0.3 &&
                  '약한 상관관계'}
                {Math.abs(correlationDisplay.r) >= 0.3 &&
                  Math.abs(correlationDisplay.r) < 0.5 &&
                  '보통 상관관계'}
                {Math.abs(correlationDisplay.r) >= 0.5 && '강한 상관관계'}
                {correlationDisplay.r > 0 ? ' (양의 방향)' : correlationDisplay.r < 0 ? ' (음의 방향)' : ''}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          )}
        </CardContent>
      </Card>

      {/* Tag Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">태그별 품질-참여 요약</CardTitle>
        </CardHeader>
        <CardContent>
          {data.tag_summary.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>태그</TableHead>
                    <TableHead className="text-right">평균 품질</TableHead>
                    <TableHead className="text-right">평균 참여도</TableHead>
                    <TableHead className="text-right">논문 수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tag_summary.map((row) => (
                    <TableRow key={row.tag}>
                      <TableCell>
                        <Badge variant="secondary">{row.tag}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.avg_quality.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.avg_engagement.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">{row.paper_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
