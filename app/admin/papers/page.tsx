'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  file_url: string;
  tags: string[];
  vote_count: number;
  survey_count: number;
  created_at: string;
}

type SortOption = 'newest' | 'votes' | 'surveys';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: '최신순' },
  { value: 'votes', label: '투표순' },
  { value: 'surveys', label: '설문순' },
];

const SORT_API_MAP: Record<SortOption, string> = {
  newest: 'newest',
  votes: 'votes',
  surveys: 'surveys',
};

const PAGE_SIZE = 20;

export default function AdminPapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);

  const fetchPapers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(page));
      if (search) params.set('search', search);
      params.set('sort', SORT_API_MAP[sort]);

      const response = await fetch(`/api/v1/papers?${params}`);
      const data = await response.json();

      if (data.success) {
        setPapers(data.data.papers || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, sort, page]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatDate(iso: string) {
    return iso ? iso.split('T')[0] : '-';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">연구보고서 목록</h1>
        <p className="text-muted-foreground">
          {isLoading ? '불러오는 중...' : `총 ${total.toLocaleString()}개의 연구보고서`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="제목 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-1">
              {SORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={sort === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSort(opt.value);
                    setPage(1);
                  }}
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
                  <TableHead className="w-32">연구분야</TableHead>
                  <TableHead className="w-16 text-center">투표</TableHead>
                  <TableHead className="w-16 text-center">설문</TableHead>
                  <TableHead className="w-28 text-right">등록일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  papers.map((paper, idx) => (
                    <TableRow key={paper.id}>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium max-w-[320px]">
                        <span className="line-clamp-2 leading-snug">{paper.title}</span>
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
                      <TableCell className="text-center">{paper.vote_count}</TableCell>
                      <TableCell className="text-center">{paper.survey_count}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(paper.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
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
