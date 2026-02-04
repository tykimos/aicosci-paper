'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Paper } from '@/types/database';

export default function AdminPapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('limit', '50');

        const response = await fetch(`/api/v1/papers?${params}`);
        const data = await response.json();

        if (data.success) {
          setPapers(data.data.papers);
        }
      } catch (error) {
        console.error('Error fetching papers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchPapers, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">논문 관리</h1>
          <p className="text-muted-foreground">
            등록된 논문을 관리합니다.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          논문 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="논문 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>저자</TableHead>
                  <TableHead>태그</TableHead>
                  <TableHead className="text-center">투표</TableHead>
                  <TableHead className="text-center">설문</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      논문이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  papers.map((paper) => (
                    <TableRow key={paper.id}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {paper.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {paper.authors.join(', ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {paper.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {paper.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{paper.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{paper.vote_count}</TableCell>
                      <TableCell className="text-center">{paper.survey_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
