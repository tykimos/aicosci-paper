'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground">
          사이트 및 관리자 설정을 관리합니다.
        </p>
      </div>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">사이트 설정</CardTitle>
          <CardDescription>
            기본 사이트 정보를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-title">사이트 제목</Label>
            <Input
              id="site-title"
              defaultValue="AI CoSci Paper Review"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">사이트 설명</Label>
            <Input
              id="site-description"
              defaultValue="AI 과학 논문 리뷰 시스템"
            />
          </div>
          <Button>저장</Button>
        </CardContent>
      </Card>

      {/* Survey Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">설문 문항 관리</CardTitle>
          <CardDescription>
            설문 문항을 추가하거나 수정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-4 border rounded-lg">
            <Label>Q1. 논문의 신뢰성은 어떻습니까?</Label>
            <p className="text-sm text-muted-foreground">
              타입: 라디오 | 옵션: 매우 높음, 높음, 보통, 낮음
            </p>
          </div>
          <div className="space-y-2 p-4 border rounded-lg">
            <Label>Q2. 연구 방법론은 적절합니까?</Label>
            <p className="text-sm text-muted-foreground">
              타입: 라디오 | 옵션: 매우 적절, 적절, 보통, 부적절
            </p>
          </div>
          <div className="space-y-2 p-4 border rounded-lg">
            <Label>Q3. 연구 결과의 실용성은 어떻습니까?</Label>
            <p className="text-sm text-muted-foreground">
              타입: 라디오 | 옵션: 매우 높음, 높음, 보통, 낮음
            </p>
          </div>
          <Button variant="outline">+ 문항 추가</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Admin Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">관리자 계정</CardTitle>
          <CardDescription>
            관리자 계정을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">admin@example.com</p>
              <p className="text-sm text-muted-foreground">Super Admin</p>
            </div>
            <Button variant="outline" size="sm">수정</Button>
          </div>
          <Button variant="outline">+ 관리자 추가</Button>
        </CardContent>
      </Card>
    </div>
  );
}
