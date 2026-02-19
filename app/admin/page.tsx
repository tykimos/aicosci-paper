'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ClipboardList, Users } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface Stats {
  total_papers: number;
  total_surveys: number;
  total_participants: number;
  today_surveys: number;
}

interface DailyEntry {
  date: string;
  surveys: number;
  new_sessions: number;
}

interface PaperStat {
  id: string;
  title: string;
  survey_count: number;
}

interface AggregateData {
  total_surveys: number;
  today_surveys: number;
  distributions: Record<string, Record<string, number>>;
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#eab308', '#ec4899', '#14b8a6'];

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function distToArray(dist: Record<string, number> | undefined) {
  if (!dist) return [];
  return Object.entries(dist)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [papers, setPapers] = useState<PaperStat[]>([]);
  const [aggregate, setAggregate] = useState<AggregateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, dailyRes, papersRes, aggRes] = await Promise.all([
          fetch('/api/v1/admin/stats'),
          fetch('/api/v1/admin/stats/daily'),
          fetch('/api/v1/admin/stats/papers'),
          fetch('/api/v1/admin/surveys/aggregate'),
        ]);

        const [statsData, dailyData, papersData, aggData] = await Promise.all([
          statsRes.json(),
          dailyRes.json(),
          papersRes.json(),
          aggRes.json(),
        ]);

        if (statsData.success) setStats(statsData.data);
        if (dailyData.success) setDaily(dailyData.data.daily || []);
        if (papersData.success) setPapers(papersData.data.papers || []);
        if (aggData.success) setAggregate(aggData.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, []);

  const statCards = [
    {
      title: '총 연구보고서',
      value: stats?.total_papers ?? 0,
      subtitle: null,
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      title: '총 설문',
      value: stats?.total_surveys ?? 0,
      subtitle: stats ? `오늘 +${stats.today_surveys}` : null,
      icon: ClipboardList,
      color: 'text-green-500',
    },
{
      title: '참여자 수',
      value: stats?.total_participants ?? 0,
      subtitle: null,
      icon: Users,
      color: 'text-purple-500',
    },
  ];

  // Prepare chart data
  const dailyChartData = daily.map((d) => ({
    date: d.date.slice(5), // MM-DD
    설문: d.surveys,
    신규참여: d.new_sessions,
  }));

  const papersChartData = papers.map((p) => ({
    name: truncate(p.title, 20),
    설문: p.survey_count,
  }));

  const orgDistData = distToArray(aggregate?.distributions?.['q1-organization']);
  const evalDistData = distToArray(aggregate?.distributions?.['q2-1']);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">AI-CO-SCI 현황을 확인하세요.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
                    {card.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top row charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Line chart: daily trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">일별 참여 추이 (30일)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyChartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval={4}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="설문"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
<Line
                    type="monotone"
                    dataKey="신규참여"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Horizontal bar chart: papers TOP 20 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">논문별 설문 수 TOP 20</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={papersChartData}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={110}
                  />
                  <Tooltip />
                  <Bar dataKey="설문" fill="#22c55e" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie chart: organization distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">응답자 소속 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : orgDistData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                데이터 없음
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orgDistData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${truncate(name, 8)} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {orgDistData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, '응답수']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar chart: overall evaluation distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">전반적 평가 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : evalDistData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                데이터 없음
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={evalDistData}
                  margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [value, '응답수']} />
                  <Bar dataKey="value" name="응답수" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
