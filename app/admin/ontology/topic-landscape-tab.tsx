import { useState, useMemo } from 'react';
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
import type { TopicsData, SimilarityData } from './page';

interface Props {
  data: TopicsData | null;
  similarityData: SimilarityData | null;
  loading: boolean;
  error: string | null;
}

type SortKey =
  | 'tag'
  | 'paper_count'
  | 'total_reads'
  | 'total_surveys'
  | 'avg_rating'
  | 'engagement_rate';

export default function TopicLandscapeTab({ data, similarityData, loading, error }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('total_reads');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedRankings = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.tag_rankings].sort((a, b) => {
      const valA = a[sortKey] ?? 0;
      const valB = b[sortKey] ?? 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return sorted;
  }, [data, sortKey, sortAsc]);

  // Build co-occurrence lookup
  const coOccurrenceLookup = useMemo(() => {
    if (!data) return new Map<string, number>();
    const lookup = new Map<string, number>();
    let maxCount = 0;
    for (const entry of data.co_occurrence.matrix) {
      lookup.set(`${entry.tag1}|||${entry.tag2}`, entry.count);
      lookup.set(`${entry.tag2}|||${entry.tag1}`, entry.count);
      if (entry.count > maxCount) maxCount = entry.count;
    }
    lookup.set('__max__', maxCount);
    return lookup;
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
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

  const tags = data.co_occurrence.tags;
  const maxCoOccurrence = coOccurrenceLookup.get('__max__') ?? 1;

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u2191' : ' \u2193';
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Tag Co-occurrence Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">태그 공동출현 히트맵</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid gap-px"
                style={{
                  gridTemplateColumns: `120px repeat(${tags.length}, 1fr)`,
                  minWidth: `${120 + tags.length * 48}px`,
                }}
              >
                {/* Header row */}
                <div className="text-xs font-medium text-muted-foreground p-1" />
                {tags.map((tag) => (
                  <div
                    key={`header-${tag}`}
                    className="text-xs font-medium text-muted-foreground p-1 text-center truncate"
                    title={tag}
                  >
                    {tag.length > 6 ? tag.slice(0, 5) + '\u2026' : tag}
                  </div>
                ))}

                {/* Data rows */}
                {tags.map((rowTag) => (
                  <>
                    <div
                      key={`row-label-${rowTag}`}
                      className="text-xs font-medium p-1 truncate flex items-center"
                      title={rowTag}
                    >
                      {rowTag}
                    </div>
                    {tags.map((colTag) => {
                      const count =
                        rowTag === colTag
                          ? 0
                          : coOccurrenceLookup.get(`${rowTag}|||${colTag}`) ?? 0;
                      const intensity =
                        maxCoOccurrence > 0 ? count / maxCoOccurrence : 0;
                      return (
                        <div
                          key={`cell-${rowTag}-${colTag}`}
                          className="aspect-square flex items-center justify-center text-xs rounded-sm min-h-[28px]"
                          style={{
                            backgroundColor:
                              rowTag === colTag
                                ? 'rgba(99, 102, 241, 0.05)'
                                : `rgba(99, 102, 241, ${intensity * 0.85})`,
                            color: intensity > 0.5 ? 'white' : undefined,
                          }}
                          title={`${rowTag} x ${colTag}: ${count}`}
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

      {/* Tag Engagement Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">태그별 참여 지표</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRankings.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('tag')}
                    >
                      태그{sortIndicator('tag')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort('paper_count')}
                    >
                      논문 수{sortIndicator('paper_count')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort('total_reads')}
                    >
                      읽기 수{sortIndicator('total_reads')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort('total_surveys')}
                    >
                      설문 수{sortIndicator('total_surveys')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort('avg_rating')}
                    >
                      평균 평점{sortIndicator('avg_rating')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort('engagement_rate')}
                    >
                      참여율{sortIndicator('engagement_rate')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRankings.map((row) => (
                    <TableRow key={row.tag}>
                      <TableCell>
                        <Badge variant="secondary">{row.tag}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.paper_count}</TableCell>
                      <TableCell className="text-right">{row.total_reads}</TableCell>
                      <TableCell className="text-right">{row.total_surveys}</TableCell>
                      <TableCell className="text-right">
                        {row.avg_rating !== null ? row.avg_rating.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {(row.engagement_rate * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Similarity Clusters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            콘텐츠 유사도 클러스터
            {similarityData && (
              <span className="text-muted-foreground font-normal ml-2">
                ({similarityData.total_papers_with_embeddings}개 논문 임베딩 분석)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!similarityData || similarityData.clusters.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>논문 1</TableHead>
                    <TableHead>논문 2</TableHead>
                    <TableHead className="text-right">유사도</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {similarityData.clusters.map((cluster, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="max-w-[200px] truncate" title={cluster.paper1.title}>
                        {cluster.paper1.title}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={cluster.paper2.title}>
                        {cluster.paper2.title}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={cluster.similarity >= 0.9 ? 'default' : 'secondary'}
                        >
                          {(cluster.similarity * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
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
