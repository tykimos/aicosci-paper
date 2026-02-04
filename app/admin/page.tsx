'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ClipboardList, ThumbsUp, Users } from 'lucide-react';

interface Stats {
  total_papers: number;
  total_surveys: number;
  total_votes: number;
  total_participants: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/v1/admin/stats');
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: '총 논문',
      value: stats?.total_papers || 0,
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      title: '총 설문',
      value: stats?.total_surveys || 0,
      icon: ClipboardList,
      color: 'text-green-500',
    },
    {
      title: '총 투표',
      value: stats?.total_votes || 0,
      icon: ThumbsUp,
      color: 'text-orange-500',
    },
    {
      title: '참여자 수',
      value: stats?.total_participants || 0,
      icon: Users,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">
          AI CoSci Paper Review 현황을 확인하세요.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <div className="text-3xl font-bold">
                    {card.value.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholder for charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">일별 참여 추이</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
            차트 영역 (recharts 연동 예정)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">논문별 설문율</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
            차트 영역 (recharts 연동 예정)
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
