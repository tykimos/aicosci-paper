'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  file_url: string;
  tags: string[];
  survey_count: number;
  created_at: string;
  hidden_at?: string | null;
}

interface PaperWithStats extends Paper {
  read_count: number;
}

type VisibilityFilter = 'all' | 'visible' | 'hidden';
type SortKey = 'newest' | 'reads' | 'surveys';
type SortDir = 'asc' | 'desc';

const VISIBILITY_OPTIONS: { value: VisibilityFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'visible', label: '공개' },
  { value: 'hidden', label: '숨김' },
];

const PAGE_SIZE = 200;

export default function AdminPapersPage() {
  const [papers, setPapers] = useState<PaperWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPapers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(page));
      params.set('include_hidden', 'true');
      if (search) params.set('search', search);
      params.set('sort', 'newest');

      const [papersRes, readsRes] = await Promise.all([
        fetch(`/api/v1/papers?${params}`),
        fetch('/api/v1/admin/stats/reads'),
      ]);

      const papersData = await papersRes.json();
      const readsData = await readsRes.json();

      if (papersData.success) {
        const rawPapers: Paper[] = papersData.data.papers || [];
        const readCounts: Record<string, number> = readsData.success ? (readsData.data?.counts || {}) : {};

        const withStats: PaperWithStats[] = rawPapers.map((p) => ({
          ...p,
          read_count: readCounts[p.id] || 0,
        }));

        setPapers(withStats);
        setTotal(papersData.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleVisibility = async (paperId: string, currentlyHidden: boolean) => {
    setTogglingId(paperId);
    try {
      const res = await fetch(`/api/v1/admin/papers/${paperId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !currentlyHidden }),
      });
      const data = await res.json();
      if (data.success) {
        setPapers((prev) =>
          prev.map((p) =>
            p.id === paperId
              ? { ...p, hidden_at: data.data.hidden ? new Date().toISOString() : null }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'desc'
      ? <ArrowDown className="h-3 w-3 ml-1" />
      : <ArrowUp className="h-3 w-3 ml-1" />;
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side visibility filter + sort
  const filteredPapers = papers
    .filter((p) => {
      if (visibility === 'visible') return !p.hidden_at;
      if (visibility === 'hidden') return !!p.hidden_at;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      switch (sortKey) {
        case 'reads':
          return (a.read_count - b.read_count) * dir;
        case 'surveys':
          return (a.survey_count - b.survey_count) * dir;
        case 'newest':
        default:
          return a.created_at.localeCompare(b.created_at) * dir;
      }
    });

  const hiddenCount = papers.filter((p) => !!p.hidden_at).length;

  function formatDate(iso: string) {
    return iso ? iso.split('T')[0] : '-';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">연구보고서 목록</h1>
        <p className="text-muted-foreground">
          {isLoading
            ? '불러오는 중...'
            : `총 ${total.toLocaleString()}개${hiddenCount > 0 ? ` (숨김 ${hiddenCount}개)` : ''}`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="제목 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-1">
              {VISIBILITY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={visibility === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisibility(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-28">파일명</TableHead>
                  <TableHead className="w-32">연구분야</TableHead>
                  <TableHead className="w-16 text-center cursor-pointer select-none" onClick={() => handleSort('reads')}>
                    <span className="inline-flex items-center">읽기<SortIcon col="reads" /></span>
                  </TableHead>
                  <TableHead className="w-16 text-center cursor-pointer select-none" onClick={() => handleSort('surveys')}>
                    <span className="inline-flex items-center">설문<SortIcon col="surveys" /></span>
                  </TableHead>
                  <TableHead className="w-28 text-right cursor-pointer select-none" onClick={() => handleSort('newest')}>
                    <span className="inline-flex items-center justify-end">등록일<SortIcon col="newest" /></span>
                  </TableHead>
                  <TableHead className="w-16 text-center">공개</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPapers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPapers.map((paper, idx) => {
                    const isHidden = !!paper.hidden_at;
                    return (
                      <TableRow key={paper.id} className={isHidden ? 'opacity-50' : ''}>
                        <TableCell className="text-center text-muted-foreground text-sm">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium max-w-[320px]">
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-2 leading-snug">{paper.title}</span>
                            {isHidden && (
                              <Badge variant="destructive" className="text-[10px] shrink-0">
                                숨김
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[112px]">
                          {paper.file_url ? paper.file_url.split('/').pop() : '-'}
                        </TableCell>
                        <TableCell>
                          {paper.tags.length > 0 ? (
                            <Badge variant="secondary" className="text-xs truncate max-w-[112px]">
                              {paper.tags[0]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{paper.read_count}</TableCell>
                        <TableCell className="text-center">{paper.survey_count}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDate(paper.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={togglingId === paper.id}
                            onClick={() => toggleVisibility(paper.id, isHidden)}
                            title={isHidden ? '공개로 전환' : '숨기기'}
                          >
                            {isHidden ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}

          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
