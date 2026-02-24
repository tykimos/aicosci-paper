'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import TopicLandscapeTab from './topic-landscape-tab';
import UserBehaviorTab from './user-behavior-tab';
import NavigationFlowsTab from './navigation-flows-tab';
import QualityMatrixTab from './quality-matrix-tab';
import AnomalyDetectionTab from './anomaly-detection-tab';
import ActionableInsightsTab from './actionable-insights-tab';

// ---------------------------------------------------------------------------
// Type definitions matching API response shapes
// ---------------------------------------------------------------------------

export interface CoOccurrenceEntry {
  tag1: string;
  tag2: string;
  count: number;
}

export interface TagRanking {
  tag: string;
  paper_count: number;
  total_reads: number;
  total_surveys: number;
  avg_rating: number | null;
  engagement_rate: number;
}

export interface TopicsData {
  co_occurrence: {
    matrix: CoOccurrenceEntry[];
    tags: string[];
  };
  tag_rankings: TagRanking[];
}

export interface SimilarityCluster {
  paper1: { id: string; title: string; tags: string[] };
  paper2: { id: string; title: string; tags: string[] };
  similarity: number;
}

export interface SimilarityData {
  clusters: SimilarityCluster[];
  total_papers_with_embeddings: number;
}

export interface ClusterSummary {
  name: string;
  label: string;
  count: number;
  percentage: number;
  avg_metrics: {
    papers_read: number;
    avg_time_per_paper: number;
    avg_scroll_depth: number;
    survey_rate: number;
    votes_cast: number;
  };
}

export interface ScatterPoint {
  session_id: string;
  papers_read: number;
  avg_time_per_paper: number;
  surveys_completed: number;
  cluster: string;
}

export interface BehaviorData {
  clusters: ClusterSummary[];
  scatter_data: ScatterPoint[];
  demographics: Record<
    string,
    {
      organization: Record<string, number>;
      user_type: Record<string, number>;
      frequency: Record<string, number>;
    }
  >;
  total_sessions: number;
}

export interface GatewayPaper {
  paper: { id: string; title: string };
  first_read_count: number;
  first_read_percentage: number;
  survey_conversion_rate: number;
  continuation_rate: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
  drop_off_rate: number;
}

export interface TagTransition {
  from_tag: string;
  to_tag: string;
  count: number;
}

export interface FrequentSequence {
  papers: string[];
  titles: string[];
  count: number;
}

export interface FlowsData {
  transitions: Array<{
    from_paper: { id: string; title: string };
    to_paper: { id: string; title: string };
    count: number;
  }>;
  gateway_papers: GatewayPaper[];
  tag_transitions: TagTransition[];
  funnel: FunnelStep[];
  frequent_sequences: {
    two_paper: FrequentSequence[];
    three_paper: FrequentSequence[];
  };
}

export interface QualityPaper {
  id: string;
  title: string;
  tags: string[];
  quality_score: number | null;
  engagement_score: number;
  quadrant: 'star' | 'hidden_gem' | 'popular_questionable' | 'needs_attention' | null;
  metrics: {
    read_count: number;
    avg_time_spent: number;
    avg_scroll_depth: number;
    survey_count: number;
    avg_rating: number | null;
  };
}

export interface QualityMatrixData {
  papers: QualityPaper[];
  medians: { quality: number; engagement: number };
  correlation: {
    reading_time_vs_rating: { r: number; n: number };
  };
  tag_summary: Array<{
    tag: string;
    avg_quality: number;
    avg_engagement: number;
    paper_count: number;
  }>;
  hidden_gems: Array<{
    id: string;
    title: string;
    quality_score: number;
    engagement_score: number;
  }>;
}

export interface FlaggedSession {
  session_id: string;
  ip_address: string | null;
  details: string;
  evidence: {
    timestamps?: string[];
    paper_ids?: string[];
    values?: number[];
  };
}

export interface RuleResult {
  rule_id: string;
  rule_name: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  flagged_sessions: FlaggedSession[];
  total_flagged: number;
}

export interface AnomalyData {
  rules: RuleResult[];
  summary: {
    total_flagged_sessions: number;
    high_severity_count: number;
    medium_severity_count: number;
    low_severity_count: number;
    flagged_percentage: number;
  };
  total_sessions: number;
}

export interface Insight {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric_value: string;
  action_label: string;
  action_type: 'link' | 'export';
  action_target: string;
  related_entities: Array<{ type: string; id: string; label: string }>;
  generated_at: string;
}

export interface InsightsData {
  kpis: {
    total_papers: number;
    total_sessions: number;
    total_surveys: number;
    survey_conversion_rate: number;
    avg_rating: number;
    hidden_gem_count: number;
    anomaly_session_count: number;
    drive_by_percentage: number;
  };
  insights: Insight[];
}

// ---------------------------------------------------------------------------
// Progress log type
// ---------------------------------------------------------------------------

interface ProgressLog {
  time: string;
  message: string;
  status: 'loading' | 'done' | 'error';
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function OntologyPage() {
  const [activeTab, setActiveTab] = useState('topics');

  // Topics tab state
  const [topicsData, setTopicsData] = useState<TopicsData | null>(null);
  const [similarityData, setSimilarityData] = useState<SimilarityData | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  // Behavior tab state
  const [behaviorData, setBehaviorData] = useState<BehaviorData | null>(null);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const [behaviorError, setBehaviorError] = useState<string | null>(null);

  // Flows tab state
  const [flowsData, setFlowsData] = useState<FlowsData | null>(null);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [flowsError, setFlowsError] = useState<string | null>(null);

  // Quality matrix tab state
  const [qualityData, setQualityData] = useState<QualityMatrixData | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  // Anomaly tab state
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyError, setAnomalyError] = useState<string | null>(null);

  // Insights tab state
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Progress log state
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);

  const addLog = (message: string, status: 'loading' | 'done' | 'error' = 'loading') => {
    const now = new Date();
    const time = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProgressLogs(prev => [...prev, { time, message, status }]);
  };

  // Topics tab
  useEffect(() => {
    if (activeTab === 'topics' && !topicsData && !topicsLoading) {
      setTopicsLoading(true);
      setTopicsError(null);
      setProgressLogs([]);

      const loadTopics = async () => {
        try {
          addLog('주제 분석 데이터를 요청합니다...');
          addLog('논문 태그 데이터 로딩 중...');
          const topicsRes = await fetch('/api/v1/admin/ontology/topics').then(r => r.json());
          if (topicsRes.success) {
            setTopicsData(topicsRes.data);
            addLog(`태그 공동출현 매트릭스 로딩 완료 (${topicsRes.data.co_occurrence.tags.length}개 태그)`, 'done');
            addLog(`태그별 참여 지표 로딩 완료 (${topicsRes.data.tag_rankings.length}개 항목)`, 'done');
          } else {
            addLog('주제 분석 데이터 로딩 실패', 'error');
            setTopicsError('데이터를 불러오지 못했습니다.');
          }

          addLog('논문 유사도 분석 중 (임베딩 비교)...');
          const simRes = await fetch('/api/v1/admin/ontology/similarity').then(r => r.json());
          if (simRes.success) {
            setSimilarityData(simRes.data);
            addLog(`유사도 분석 완료 (${simRes.data.total_papers_with_embeddings}개 논문, ${simRes.data.clusters.length}개 클러스터)`, 'done');
          } else {
            addLog('유사도 분석 실패', 'error');
          }
          addLog('주제 분석 탭 로딩 완료!', 'done');
        } catch {
          addLog('네트워크 오류가 발생했습니다.', 'error');
          setTopicsError('네트워크 오류가 발생했습니다.');
        } finally {
          setTopicsLoading(false);
        }
      };
      loadTopics();
    }
  }, [activeTab, topicsData, topicsLoading]);

  // Behavior tab
  useEffect(() => {
    if (activeTab === 'behavior' && !behaviorData && !behaviorLoading) {
      setBehaviorLoading(true);
      setBehaviorError(null);
      setProgressLogs([]);

      const loadBehavior = async () => {
        try {
          addLog('세션 데이터 로딩 중...');
          addLog('사용자 행동 클러스터링 분석 중...');
          const res = await fetch('/api/v1/admin/ontology/behavior').then(r => r.json());
          if (res.success) {
            setBehaviorData(res.data);
            addLog(`사용자 행동 분석 완료 (${res.data.total_sessions}개 세션, ${res.data.clusters.length}개 클러스터)`, 'done');
            addLog('사용자 행동 탭 로딩 완료!', 'done');
          } else {
            addLog('사용자 행동 데이터 로딩 실패', 'error');
            setBehaviorError('데이터를 불러오지 못했습니다.');
          }
        } catch {
          addLog('네트워크 오류가 발생했습니다.', 'error');
          setBehaviorError('네트워크 오류가 발생했습니다.');
        } finally {
          setBehaviorLoading(false);
        }
      };
      loadBehavior();
    }
  }, [activeTab, behaviorData, behaviorLoading]);

  // Flows tab
  useEffect(() => {
    if (activeTab === 'flows' && !flowsData && !flowsLoading) {
      setFlowsLoading(true);
      setFlowsError(null);
      setProgressLogs([]);

      const loadFlows = async () => {
        try {
          addLog('읽기 진행 데이터 로딩 중...');
          addLog('논문 전이 매트릭스 계산 중...');
          const res = await fetch('/api/v1/admin/ontology/flows').then(r => r.json());
          if (res.success) {
            setFlowsData(res.data);
            addLog(`탐색 흐름 분석 완료 (${res.data.gateway_papers.length}개 게이트웨이 논문)`, 'done');
            addLog('탐색 흐름 탭 로딩 완료!', 'done');
          } else {
            addLog('탐색 흐름 데이터 로딩 실패', 'error');
            setFlowsError('데이터를 불러오지 못했습니다.');
          }
        } catch {
          addLog('네트워크 오류가 발생했습니다.', 'error');
          setFlowsError('네트워크 오류가 발생했습니다.');
        } finally {
          setFlowsLoading(false);
        }
      };
      loadFlows();
    }
  }, [activeTab, flowsData, flowsLoading]);

  // Quality matrix tab
  useEffect(() => {
    if (activeTab === 'quality' && !qualityData && !qualityLoading) {
      setQualityLoading(true);
      setQualityError(null);
      setProgressLogs([]);

      const loadQuality = async () => {
        try {
          addLog('설문 응답 데이터 로딩 중...');
          addLog('품질-참여 점수 계산 중...');
          const res = await fetch('/api/v1/admin/ontology/quality-matrix').then(r => r.json());
          if (res.success) {
            setQualityData(res.data);
            addLog(`품질-참여 매트릭스 완료 (${res.data.papers.length}개 논문 분석)`, 'done');
            addLog('품질 매트릭스 탭 로딩 완료!', 'done');
          } else {
            addLog('품질 매트릭스 데이터 로딩 실패', 'error');
            setQualityError('데이터를 불러오지 못했습니다.');
          }
        } catch {
          addLog('네트워크 오류가 발생했습니다.', 'error');
          setQualityError('네트워크 오류가 발생했습니다.');
        } finally {
          setQualityLoading(false);
        }
      };
      loadQuality();
    }
  }, [activeTab, qualityData, qualityLoading]);

  // Anomaly tab
  useEffect(() => {
    if (activeTab === 'anomalies' && !anomalyData && !anomalyLoading) {
      setAnomalyLoading(true);
      setAnomalyError(null);
      setProgressLogs([]);

      const loadAnomalies = async () => {
        try {
          addLog('세션/설문/읽기 데이터 로딩 중...');
          addLog('8개 규칙 이상 탐지 실행 중...');
          const res = await fetch('/api/v1/admin/ontology/anomalies').then(r => r.json());
          if (res.success) {
            setAnomalyData(res.data);
            addLog(`이상 탐지 완료 (${res.data.summary.total_flagged_sessions}개 세션 플래그)`, 'done');
            addLog('이상 탐지 탭 로딩 완료!', 'done');
          } else {
            addLog('이상 탐지 데이터 로딩 실패', 'error');
            setAnomalyError('데이터를 불러오지 못했습니다.');
          }
        } catch {
          addLog('네트워크 오류가 발생했습니다.', 'error');
          setAnomalyError('네트워크 오류가 발생했습니다.');
        } finally {
          setAnomalyLoading(false);
        }
      };
      loadAnomalies();
    }
  }, [activeTab, anomalyData, anomalyLoading]);

  // Insights tab
  useEffect(() => {
    if (activeTab === 'insights' && !insightsData && !insightsLoading) {
      setInsightsLoading(true);
      setInsightsError(null);
      setProgressLogs([]);

      const loadInsights = async () => {
        try {
          addLog('종합 인사이트 생성 중...');
          const res = await fetch('/api/v1/admin/ontology/insights').then(r => r.json());
          if (res.success) {
            setInsightsData(res.data);
            addLog(`인사이트 분석 완료 (${res.data.insights.length}개 인사이트)`, 'done');
            addLog('인사이트 탭 로딩 완료!', 'done');
          } else {
            addLog('인사이트 데이터 로딩 실패', 'error');
            setInsightsError('데이터를 불러오지 못했습니다.');
          }
        } catch {
          addLog('네트워크 오류가 발생했습니다.', 'error');
          setInsightsError('네트워크 오류가 발생했습니다.');
        } finally {
          setInsightsLoading(false);
        }
      };
      loadInsights();
    }
  }, [activeTab, insightsData, insightsLoading]);

  const isAnyLoading = topicsLoading || behaviorLoading || flowsLoading || qualityLoading || anomalyLoading || insightsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">온톨로지 분석</h1>
        <p className="text-muted-foreground">
          논문 주제, 사용자 행동, 탐색 흐름, 품질 매트릭스를 종합적으로 분석합니다.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="topics">주제 분석</TabsTrigger>
          <TabsTrigger value="behavior">사용자 행동</TabsTrigger>
          <TabsTrigger value="flows">탐색 흐름</TabsTrigger>
          <TabsTrigger value="quality">품질-참여 매트릭스</TabsTrigger>
          <TabsTrigger value="anomalies">이상 탐지</TabsTrigger>
          <TabsTrigger value="insights">인사이트</TabsTrigger>
        </TabsList>

        {/* Progress Log */}
        {isAnyLoading && progressLogs.length > 0 && (
          <Card className="border-green-900/30 bg-gray-950 mt-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400 font-mono">분석 진행 중...</span>
              </div>
              <div className="font-mono text-xs space-y-1 max-h-[200px] overflow-y-auto">
                {progressLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">[{log.time}]</span>
                    <span className={
                      log.status === 'done' ? 'text-green-400' :
                      log.status === 'error' ? 'text-red-400' :
                      'text-yellow-300'
                    }>
                      {log.status === 'done' ? '✓' : log.status === 'error' ? '✗' : '→'} {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <TabsContent value="topics">
          <TopicLandscapeTab
            data={topicsData}
            similarityData={similarityData}
            loading={topicsLoading}
            error={topicsError}
          />
        </TabsContent>

        <TabsContent value="behavior">
          <UserBehaviorTab
            data={behaviorData}
            loading={behaviorLoading}
            error={behaviorError}
          />
        </TabsContent>

        <TabsContent value="flows">
          <NavigationFlowsTab
            data={flowsData}
            loading={flowsLoading}
            error={flowsError}
          />
        </TabsContent>

        <TabsContent value="quality">
          <QualityMatrixTab
            data={qualityData}
            loading={qualityLoading}
            error={qualityError}
          />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomalyDetectionTab
            data={anomalyData}
            loading={anomalyLoading}
            error={anomalyError}
          />
        </TabsContent>

        <TabsContent value="insights">
          <ActionableInsightsTab
            data={insightsData}
            loading={insightsLoading}
            error={insightsError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
