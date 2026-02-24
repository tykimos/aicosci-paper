import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnomalyData } from './page';

interface Props {
  data: AnomalyData | null;
  loading: boolean;
  error: string | null;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: '높음' },
  MEDIUM: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: '보통' },
  LOW: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: '낮음' },
};

export default function AnomalyDetectionTab({ data, loading, error }: Props) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleRule = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 flex justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-4 flex justify-center">
        <p className="text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6 mt-4">
      {/* Summary badges */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              HIGH
            </div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary.high_severity_count}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              MEDIUM
            </div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {summary.medium_severity_count}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              LOW
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {summary.low_severity_count}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              플래그 세션
            </div>
            <div className="text-3xl font-bold">
              {summary.total_flagged_sessions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              전체 {data.total_sessions}개 중 {summary.flagged_percentage}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-rule cards */}
      <div className="space-y-4">
        {data.rules.map((rule) => {
          const style = SEVERITY_STYLES[rule.severity] ?? SEVERITY_STYLES.LOW;
          const isExpanded = expandedRules.has(rule.rule_id);

          return (
            <Card key={rule.rule_id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleRule(rule.rule_id)}
              >
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-medium flex-1">
                    {rule.rule_name}
                    <span className="text-muted-foreground font-normal ml-2">
                      ({rule.rule_id})
                    </span>
                  </CardTitle>
                  <Badge className={`${style.bg} ${style.text} border-0`}>
                    {style.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {rule.total_flagged}건
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {isExpanded ? '\u25B2' : '\u25BC'}
                  </span>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent>
                  {rule.flagged_sessions.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      탐지된 세션 없음
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>세션 ID</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>세부 사항</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rule.flagged_sessions.slice(0, 50).map((fs, idx) => (
                            <TableRow key={`${rule.rule_id}-${idx}`}>
                              <TableCell className="font-mono text-xs max-w-[150px] truncate">
                                {fs.session_id}
                              </TableCell>
                              <TableCell className="text-xs">
                                {fs.ip_address ?? '-'}
                              </TableCell>
                              <TableCell className="text-xs max-w-[300px] truncate" title={fs.details}>
                                {fs.details}
                              </TableCell>
                            </TableRow>
                          ))}
                          {rule.flagged_sessions.length > 50 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground text-xs">
                                ... 외 {rule.flagged_sessions.length - 50}건 더
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* All flagged sessions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            전체 플래그 세션 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const allSessions = data.rules.flatMap((rule) =>
              rule.flagged_sessions.map((fs) => ({
                ...fs,
                rule_id: rule.rule_id,
                rule_name: rule.rule_name,
                severity: rule.severity,
              }))
            );

            if (allSessions.length === 0) {
              return (
                <p className="text-muted-foreground text-sm text-center py-8">
                  이상 세션이 탐지되지 않았습니다.
                </p>
              );
            }

            return (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>세션 ID</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>규칙</TableHead>
                      <TableHead>심각도</TableHead>
                      <TableHead>세부 사항</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSessions.slice(0, 100).map((session, idx) => {
                      const style = SEVERITY_STYLES[session.severity] ?? SEVERITY_STYLES.LOW;
                      return (
                        <TableRow key={`all-${idx}`}>
                          <TableCell className="font-mono text-xs max-w-[150px] truncate">
                            {session.session_id}
                          </TableCell>
                          <TableCell className="text-xs">
                            {session.ip_address ?? '-'}
                          </TableCell>
                          <TableCell className="text-xs">{session.rule_name}</TableCell>
                          <TableCell>
                            <Badge className={`${style.bg} ${style.text} border-0 text-xs`}>
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate" title={session.details}>
                            {session.details}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {allSessions.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-xs">
                          ... 외 {allSessions.length - 100}건 더
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
