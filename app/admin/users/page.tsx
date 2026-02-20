'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SessionRow {
  id: string;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  screen_width: number | null;
  screen_height: number | null;
  language: string | null;
  created_at: string;
  last_active_at: string;
}

interface UserStats {
  total: number;
  distributions: {
    device: Record<string, number>;
    browser: Record<string, number>;
    os: Record<string, number>;
    referrer: Record<string, number>;
  };
  recent: SessionRow[];
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#eab308', '#ec4899', '#14b8a6'];

function distToArray(dist: Record<string, number>) {
  return Object.entries(dist)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/stats/users')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const deviceData = data ? distToArray(data.distributions.device) : [];
  const browserData = data ? distToArray(data.distributions.browser) : [];
  const osData = data ? distToArray(data.distributions.os) : [];
  const referrerData = data ? distToArray(data.distributions.referrer).slice(0, 10) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">참여자 현황</h1>
        <p className="text-muted-foreground">
          {isLoading ? '불러오는 중...' : `총 ${data?.total.toLocaleString() || 0}명`}
        </p>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Device Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">디바이스 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : deviceData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">데이터 없음</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {deviceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Browser */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">브라우저 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : browserData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">데이터 없음</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={browserData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {browserData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* OS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">OS 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : osData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">데이터 없음</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={osData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {osData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrer Top 10 */}
      {referrerData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">진입 경로 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrerData.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[300px]">{r.name}</span>
                  <span className="font-medium">{r.value}명</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">최근 접속자 (최대 100명)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-28">IP</TableHead>
                    <TableHead className="w-20">디바이스</TableHead>
                    <TableHead className="w-20">브라우저</TableHead>
                    <TableHead className="w-20">OS</TableHead>
                    <TableHead className="w-24">화면</TableHead>
                    <TableHead className="w-16">언어</TableHead>
                    <TableHead className="w-36">진입경로</TableHead>
                    <TableHead className="w-28 text-right">최초접속</TableHead>
                    <TableHead className="w-28 text-right">최근접속</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.recent || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                        데이터가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.recent || []).map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                        <TableCell className="text-xs font-mono">{s.ip_address || '-'}</TableCell>
                        <TableCell className="text-xs">{s.device_type || '-'}</TableCell>
                        <TableCell className="text-xs">{s.browser || '-'}</TableCell>
                        <TableCell className="text-xs">{s.os || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {s.screen_width && s.screen_height ? `${s.screen_width}x${s.screen_height}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs">{s.language || '-'}</TableCell>
                        <TableCell className="text-xs truncate max-w-[140px]">
                          {s.referrer || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatDate(s.created_at)}</TableCell>
                        <TableCell className="text-xs text-right">{formatDate(s.last_active_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
