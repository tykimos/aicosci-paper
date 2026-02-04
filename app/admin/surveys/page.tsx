'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';

export default function AdminSurveysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설문 결과</h1>
        <p className="text-muted-foreground">
          설문 응답을 확인하고 분석합니다.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 설문 응답
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              오늘 응답
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              평균 응답 시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      {/* Question Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">질문별 응답 분포</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          차트 영역 (설문 데이터가 있을 때 표시)
        </CardContent>
      </Card>

      {/* Survey List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">설문 응답 목록</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="논문으로 검색..."
                className="pl-9 w-[250px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>논문</TableHead>
                <TableHead>응답 일시</TableHead>
                <TableHead className="text-center">Q1</TableHead>
                <TableHead className="text-center">Q2</TableHead>
                <TableHead className="text-center">Q3</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  설문 응답이 없습니다.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
