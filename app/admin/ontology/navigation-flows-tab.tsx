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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { FlowsData } from './page';

interface Props {
  data: FlowsData | null;
  loading: boolean;
  error: string | null;
}

const FUNNEL_LABELS: Record<string, string> = {
  'Total sessions': '전체 세션',
  'Sessions with at least 1 read': '첫 논문 읽기',
  'Sessions with 2+ distinct papers read': '2번째 논문',
  'Sessions with survey completed': '설문 완료',
};

export default function NavigationFlowsTab({ data, loading, error }: Props) {
  // Build tag transition heatmap data
  const tagTransitionData = useMemo(() => {
    if (!data || data.tag_transitions.length === 0) return { tags: [] as string[], lookup: new Map<string, number>(), max: 0 };
    const tagSet = new Set<string>();
    let max = 0;
    const lookup = new Map<string, number>();
    for (const t of data.tag_transitions) {
      tagSet.add(t.from_tag);
      tagSet.add(t.to_tag);
      const key = `${t.from_tag}|||${t.to_tag}`;
      lookup.set(key, t.count);
      if (t.count > max) max = t.count;
    }
    return { tags: Array.from(tagSet).sort(), lookup, max };
  }, [data]);

  const funnelChartData = useMemo(() => {
    if (!data) return [];
    return data.funnel.map((step) => ({
      name: FUNNEL_LABELS[step.step] ?? step.step,
      count: step.count,
      percentage: step.percentage,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
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
      {/* Gateway Papers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">게이트웨이 논문 (첫 번째로 읽는 논문)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.gateway_papers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>논문</TableHead>
                    <TableHead className="text-right">첫 읽기 수</TableHead>
                    <TableHead className="text-right">첫 읽기 비율</TableHead>
                    <TableHead className="text-right">설문 전환율</TableHead>
                    <TableHead className="text-right">다음 논문 진행률</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.gateway_papers.slice(0, 20).map((gp) => (
                    <TableRow key={gp.paper.id}>
                      <TableCell
                        className="max-w-[250px] truncate"
                        title={gp.paper.title}
                      >
                        {gp.paper.title}
                      </TableCell>
                      <TableCell className="text-right">{gp.first_read_count}</TableCell>
                      <TableCell className="text-right">
                        {(gp.first_read_percentage * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {(gp.survey_conversion_rate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {(gp.continuation_rate * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">전환 퍼널</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelChartData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                layout="vertical"
                data={funnelChartData}
                margin={{ top: 4, right: 40, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number, _: string, props: { payload?: { percentage: number } }) => [
                    `${value.toLocaleString()} (${((props.payload?.percentage ?? 0) * 100).toFixed(1)}%)`,
                    '세션 수',
                  ]}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Drop-off rates */}
          {data.funnel.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.funnel.slice(1).map((step, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {FUNNEL_LABELS[step.step] ?? step.step}: 이탈률{' '}
                  {(step.drop_off_rate * 100).toFixed(1)}%
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tag Transition Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">태그 간 이동 히트맵 (From -{'>'} To)</CardTitle>
        </CardHeader>
        <CardContent>
          {tagTransitionData.tags.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid gap-px"
                style={{
                  gridTemplateColumns: `120px repeat(${tagTransitionData.tags.length}, 1fr)`,
                  minWidth: `${120 + tagTransitionData.tags.length * 48}px`,
                }}
              >
                {/* Header row */}
                <div className="text-xs font-medium text-muted-foreground p-1" />
                {tagTransitionData.tags.map((tag) => (
                  <div
                    key={`th-${tag}`}
                    className="text-xs font-medium text-muted-foreground p-1 text-center truncate"
                    title={tag}
                  >
                    {tag.length > 6 ? tag.slice(0, 5) + '\u2026' : tag}
                  </div>
                ))}

                {/* Data rows */}
                {tagTransitionData.tags.map((rowTag) => (
                  <>
                    <div
                      key={`rl-${rowTag}`}
                      className="text-xs font-medium p-1 truncate flex items-center"
                      title={rowTag}
                    >
                      {rowTag}
                    </div>
                    {tagTransitionData.tags.map((colTag) => {
                      const count =
                        tagTransitionData.lookup.get(`${rowTag}|||${colTag}`) ?? 0;
                      const intensity =
                        tagTransitionData.max > 0 ? count / tagTransitionData.max : 0;
                      return (
                        <div
                          key={`tc-${rowTag}-${colTag}`}
                          className="aspect-square flex items-center justify-center text-xs rounded-sm min-h-[28px]"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${intensity * 0.85})`,
                            color: intensity > 0.5 ? 'white' : undefined,
                          }}
                          title={`${rowTag} -> ${colTag}: ${count}`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frequent Sequences */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 2-paper sequences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">자주 나타나는 2-논문 시퀀스</CardTitle>
          </CardHeader>
          <CardContent>
            {data.frequent_sequences.two_paper.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {data.frequent_sequences.two_paper.map((seq, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm border rounded-lg p-3"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {seq.count}회
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <span className="truncate block" title={seq.titles[0]}>
                        {seq.titles[0]}
                      </span>
                      <span className="text-muted-foreground mx-1">-{'>'}</span>
                      <span className="truncate block" title={seq.titles[1]}>
                        {seq.titles[1]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3-paper sequences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">자주 나타나는 3-논문 시퀀스</CardTitle>
          </CardHeader>
          <CardContent>
            {data.frequent_sequences.three_paper.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {data.frequent_sequences.three_paper.map((seq, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm border rounded-lg p-3"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {seq.count}회
                    </Badge>
                    <div className="min-w-0 flex-1">
                      {seq.titles.map((title, tIdx) => (
                        <span key={tIdx}>
                          <span className="truncate block" title={title}>
                            {title}
                          </span>
                          {tIdx < seq.titles.length - 1 && (
                            <span className="text-muted-foreground mx-1">-{'>'}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
