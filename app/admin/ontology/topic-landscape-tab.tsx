import { useState, useMemo, useRef, useEffect } from 'react';
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

function KnowledgeGraph({ data, similarityData }: { data: TopicsData; similarityData: SimilarityData | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Array<{ id: string; x: number; y: number; r: number; reads: number }>>([]);
  const [edges, setEdges] = useState<Array<{ source: string; target: string; count: number }>>([]);

  useEffect(() => {
    // Build nodes from tag_rankings
    const tagNodes = data.tag_rankings.map(t => ({
      id: t.tag,
      x: 0, y: 0,
      r: Math.max(20, Math.min(50, 20 + (t.paper_count / Math.max(...data.tag_rankings.map(r => r.paper_count))) * 30)),
      reads: t.total_reads,
    }));

    // Build edges from co-occurrence matrix (only count > 0)
    const tagEdges = data.co_occurrence.matrix
      .filter(e => e.count > 0)
      .map(e => ({ source: e.tag1, target: e.tag2, count: e.count }));

    // Simple force-directed layout
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions in a circle
    tagNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / tagNodes.length;
      const radius = 180;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });

    // Run simple force simulation (80 iterations)
    for (let iter = 0; iter < 80; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < tagNodes.length; i++) {
        for (let j = i + 1; j < tagNodes.length; j++) {
          const dx = tagNodes[j].x - tagNodes[i].x;
          const dy = tagNodes[j].y - tagNodes[i].y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = 2000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          tagNodes[i].x -= fx;
          tagNodes[i].y -= fy;
          tagNodes[j].x += fx;
          tagNodes[j].y += fy;
        }
      }

      // Attraction along edges
      for (const edge of tagEdges) {
        const source = tagNodes.find(n => n.id === edge.source);
        const target = tagNodes.find(n => n.id === edge.target);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const strength = 0.01 * Math.log(1 + edge.count);
        const fx = dx * strength;
        const fy = dy * strength;
        source.x += fx;
        source.y += fy;
        target.x -= fx;
        target.y -= fy;
      }

      // Center gravity
      for (const node of tagNodes) {
        node.x += (centerX - node.x) * 0.01;
        node.y += (centerY - node.y) * 0.01;
        // Boundary clamping
        node.x = Math.max(60, Math.min(width - 60, node.x));
        node.y = Math.max(60, Math.min(height - 60, node.y));
      }
    }

    setNodes(tagNodes);
    setEdges(tagEdges);
  }, [data]);

  const maxEdgeCount = Math.max(1, ...edges.map(e => e.count));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Determine which edges to highlight
  const highlightedEdges = new Set<string>();
  const connectedTags = new Set<string>();
  if (hoveredTag) {
    connectedTags.add(hoveredTag);
    edges.forEach(e => {
      if (e.source === hoveredTag || e.target === hoveredTag) {
        highlightedEdges.add(`${e.source}-${e.target}`);
        connectedTags.add(e.source);
        connectedTags.add(e.target);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          지식 그래프
          <span className="text-muted-foreground font-normal ml-2">태그 간 연결 관계</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900/50 border">
          <svg
            ref={svgRef}
            viewBox="0 0 800 500"
            className="w-full h-auto"
            style={{ maxHeight: '500px' }}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;
              const edgeKey = `${edge.source}-${edge.target}`;
              const isHighlighted = !hoveredTag || highlightedEdges.has(edgeKey);
              const opacity = hoveredTag ? (isHighlighted ? 0.6 : 0.05) : 0.3;
              const strokeWidth = 1 + (edge.count / maxEdgeCount) * 4;
              return (
                <line
                  key={`edge-${i}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted && hoveredTag ? '#6366f1' : '#94a3b8'}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const isHighlighted = !hoveredTag || connectedTags.has(node.id);
              const isHovered = hoveredTag === node.id;
              return (
                <g
                  key={`node-${node.id}`}
                  onMouseEnter={() => setHoveredTag(node.id)}
                  onMouseLeave={() => setHoveredTag(null)}
                  className="cursor-pointer"
                  opacity={isHighlighted ? 1 : 0.2}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill={isHovered ? '#4f46e5' : '#6366f1'}
                    stroke={isHovered ? '#312e81' : '#4338ca'}
                    strokeWidth={isHovered ? 3 : 1.5}
                    opacity={0.85}
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={node.r > 30 ? 11 : 9}
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {node.id.length > 8 ? node.id.slice(0, 7) + '\u2026' : node.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {hoveredTag && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{hoveredTag}</span> 태그와 연결된 태그:{' '}
            {edges
              .filter(e => e.source === hoveredTag || e.target === hoveredTag)
              .map(e => (e.source === hoveredTag ? e.target : e.source))
              .join(', ')
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
      {/* Knowledge Graph */}
      <KnowledgeGraph data={data} similarityData={similarityData} />

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
