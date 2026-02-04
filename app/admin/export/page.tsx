'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';

export default function AdminExportPage() {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    setIsExporting(format);

    try {
      const response = await fetch(`/api/v1/admin/export?format=${format}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-data.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const exportOptions = [
    {
      format: 'csv' as const,
      title: 'CSV',
      description: 'CSV 형식으로 다운로드 (Excel, Numbers 등에서 열기 가능)',
      icon: FileText,
    },
    {
      format: 'xlsx' as const,
      title: 'Excel',
      description: 'Excel 형식으로 다운로드 (.xlsx)',
      icon: FileSpreadsheet,
    },
    {
      format: 'json' as const,
      title: 'JSON',
      description: 'JSON 형식으로 다운로드 (개발자용)',
      icon: FileJson,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">데이터 다운로드</h1>
        <p className="text-muted-foreground">
          설문 결과와 투표 데이터를 다운로드합니다.
        </p>
      </div>

      {/* Export Options */}
      <div className="grid gap-4 md:grid-cols-3">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.format}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                </div>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleExport(option.format)}
                  disabled={isExporting !== null}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting === option.format ? '다운로드 중...' : '다운로드'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">다운로드 옵션</CardTitle>
          <CardDescription>
            다운로드할 데이터를 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="surveys" defaultChecked className="accent-primary" />
            <Label htmlFor="surveys">설문 응답 데이터</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="votes" defaultChecked className="accent-primary" />
            <Label htmlFor="votes">투표 데이터</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="papers" defaultChecked className="accent-primary" />
            <Label htmlFor="papers">논문 메타데이터</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
