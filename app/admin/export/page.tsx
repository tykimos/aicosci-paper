'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';

interface Paper {
  id: string;
  title: string;
}

type DataType = 'surveys' | 'papers';
type ExportFormat = 'csv' | 'xlsx' | 'json';

export default function AdminExportPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [dataType, setDataType] = useState<DataType>('surveys');
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  useEffect(() => {
    fetch('/api/v1/papers?limit=200')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPapers(data.data || []);
      })
      .catch(() => {});
  }, []);

  const handleDownload = async (format: ExportFormat) => {
    setDownloading(format);
    try {
      const params = new URLSearchParams({ format, type: dataType });
      if (selectedPaperId) params.set('paper_id', selectedPaperId);

      const response = await fetch(`/api/v1/admin/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const ext = format;
      const typeLabel = dataType === 'surveys' ? 'surveys' : 'papers';
      const paperSuffix = selectedPaperId ? `-${selectedPaperId.slice(0, 8)}` : '';
      a.download = `${typeLabel}${paperSuffix}.${ext}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setDownloading(null);
    }
  };

  const formatOptions: { format: ExportFormat; label: string; description: string; Icon: typeof FileText }[] = [
    {
      format: 'csv',
      label: 'CSV',
      description: 'Excel, Numbers 등에서 열기 가능한 범용 형식',
      Icon: FileText,
    },
    {
      format: 'xlsx',
      label: 'Excel',
      description: 'Microsoft Excel 전용 형식 (.xlsx)',
      Icon: FileSpreadsheet,
    },
    {
      format: 'json',
      label: 'JSON',
      description: '개발자 및 시스템 연동용 형식',
      Icon: FileJson,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">데이터 내보내기</h1>
        <p className="text-muted-foreground">설문 응답 및 논문 메타데이터를 다운로드합니다.</p>
      </div>

      {/* Step 1: Data type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">1단계 — 데이터 유형 선택</CardTitle>
          <CardDescription>내보낼 데이터의 종류를 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="dataType"
              value="surveys"
              checked={dataType === 'surveys'}
              onChange={() => setDataType('surveys')}
              className="accent-primary"
            />
            <span className="text-sm font-medium">설문 응답</span>
            <span className="text-xs text-muted-foreground">사용자가 제출한 설문지 전체 응답</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="dataType"
              value="papers"
              checked={dataType === 'papers'}
              onChange={() => setDataType('papers')}
              className="accent-primary"
            />
            <span className="text-sm font-medium">논문 메타데이터</span>
            <span className="text-xs text-muted-foreground">등록된 논문의 제목, 저자, 연도 등 메타정보</span>
          </label>
        </CardContent>
      </Card>

      {/* Step 2: Paper filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">2단계 — 논문 범위 선택</CardTitle>
          <CardDescription>특정 논문만 내보내거나 전체를 선택할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="paperFilter"
              value=""
              checked={selectedPaperId === ''}
              onChange={() => setSelectedPaperId('')}
              className="accent-primary"
            />
            <span className="text-sm font-medium">전체 논문</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="paperFilter"
              value="specific"
              checked={selectedPaperId !== ''}
              onChange={() => {
                if (papers.length > 0) setSelectedPaperId(papers[0].id);
              }}
              className="accent-primary mt-0.5"
            />
            <div className="flex-1 space-y-2">
              <span className="text-sm font-medium">특정 논문 선택</span>
              {selectedPaperId !== '' && (
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                >
                  {papers.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              )}
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Step 3: Format & Download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">3단계 — 형식 선택 및 다운로드</CardTitle>
          <CardDescription>원하는 파일 형식으로 다운로드하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {formatOptions.map(({ format, label, description, Icon }) => (
              <div
                key={format}
                className="flex flex-col gap-3 border rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground flex-1">{description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDownload(format)}
                  disabled={downloading !== null}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading === format ? '다운로드 중...' : `${label} 다운로드`}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Current selection summary */}
      <div className="text-sm text-muted-foreground px-1 space-y-1">
        <p>
          <span className="font-medium text-foreground">현재 선택:</span>{' '}
          {dataType === 'surveys' ? '설문 응답' : '논문 메타데이터'}
          {' / '}
          {selectedPaperId
            ? `논문: ${papers.find((p) => p.id === selectedPaperId)?.title ?? selectedPaperId}`
            : '전체 논문'}
        </p>
        <p className="text-xs">위 형식 버튼을 클릭하면 즉시 다운로드가 시작됩니다.</p>
      </div>
    </div>
  );
}
