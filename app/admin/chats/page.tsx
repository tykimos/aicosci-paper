'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare, ArrowUpDown, ChevronDown, ChevronUp, X,
  Clock, Hash, Type, Timer, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatSession {
  session_id: string;
  turn_count: number;
  message_count: number;
  first_message: string;
  last_message: string;
  first_chat: string;
  last_chat: string;
  paper_count: number;
  duration_sec: number;
  user_chars: number;
  assistant_chars: number;
  total_chars: number;
  user_tokens: number;
  assistant_tokens: number;
  total_tokens: number;
  avg_response_sec: number;
  avg_user_interval_sec: number;
}

interface Summary {
  total_sessions: number;
  total_turns: number;
  total_messages: number;
  total_tokens: number;
  avg_turns: number;
  avg_duration_sec: number;
  avg_response_sec: number;
}

interface ChatMessage {
  id: string;
  session_id: string;
  paper_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

type SortField = 'turns' | 'messages' | 'last_chat' | 'duration' | 'tokens' | 'response' | 'interval';

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}초`;
  if (sec < 3600) return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}시간 ${m}분`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

export default function AdminChatsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('last_chat');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [detailMessages, setDetailMessages] = useState<ChatMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/chats?sort=${sortBy}&order=${sortOrder}`);
      const json = await res.json();
      if (json.success) {
        setSessions(json.data.sessions);
        setSummary(json.data.summary);
      }
    } catch (e) {
      console.error('Failed to fetch chat sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [sortBy, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      className="flex items-center hover:text-foreground whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  const openDetail = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/chats/${sessionId}`);
      const json = await res.json();
      if (json.success) {
        setDetailMessages(json.data.messages);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  // Compute detail stats from messages
  const detailSession = sessions.find(s => s.session_id === selectedSession);

  // Per-message time diffs for detail view
  const getTimeDiff = (idx: number): string | null => {
    if (idx === 0) return null;
    const prev = new Date(detailMessages[idx - 1].created_at).getTime();
    const curr = new Date(detailMessages[idx].created_at).getTime();
    const diffSec = Math.round((curr - prev) / 1000);
    return formatDuration(diffSec);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          채팅 히스토리
        </h1>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">세션 수</div>
              <div className="text-xl font-bold">{summary.total_sessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">총 턴</div>
              <div className="text-xl font-bold">{formatNumber(summary.total_turns)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">총 메시지</div>
              <div className="text-xl font-bold">{formatNumber(summary.total_messages)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">총 토큰(추정)</div>
              <div className="text-xl font-bold">{formatNumber(summary.total_tokens)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">평균 턴/세션</div>
              <div className="text-xl font-bold">{summary.avg_turns}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">평균 소요시간</div>
              <div className="text-xl font-bold text-base">{formatDuration(summary.avg_duration_sec)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">평균 응답시간</div>
              <div className="text-xl font-bold text-base">{formatDuration(summary.avg_response_sec)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session list */}
        <div className={selectedSession ? 'lg:col-span-1' : 'lg:col-span-3'}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">세션 목록</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">채팅 기록이 없습니다</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">세션</TableHead>
                        <TableHead><SortButton field="turns" label="턴" /></TableHead>
                        <TableHead><SortButton field="duration" label="소요시간" /></TableHead>
                        {!selectedSession && (
                          <>
                            <TableHead><SortButton field="tokens" label="토큰" /></TableHead>
                            <TableHead><SortButton field="response" label="응답시간" /></TableHead>
                            <TableHead><SortButton field="interval" label="입력간격" /></TableHead>
                            <TableHead>첫 메시지</TableHead>
                          </>
                        )}
                        <TableHead><SortButton field="last_chat" label="시간" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => (
                        <TableRow
                          key={s.session_id}
                          className={`cursor-pointer hover:bg-accent ${selectedSession === s.session_id ? 'bg-accent' : ''}`}
                          onClick={() => openDetail(s.session_id)}
                        >
                          <TableCell className="font-mono text-xs">
                            {s.session_id.substring(0, 8)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.turn_count >= 5 ? 'default' : 'secondary'}>
                              {s.turn_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDuration(s.duration_sec)}
                          </TableCell>
                          {!selectedSession && (
                            <>
                              <TableCell className="text-xs whitespace-nowrap">
                                {formatNumber(s.total_tokens)}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {s.avg_response_sec > 0 ? formatDuration(s.avg_response_sec) : '-'}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {s.avg_user_interval_sec > 0 ? formatDuration(s.avg_user_interval_sec) : '-'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                                {s.first_message || '-'}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(s.last_chat)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail view */}
        {selectedSession && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    대화 내용
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {selectedSession.substring(0, 12)}...
                    </span>
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSession(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Per-session stats bar */}
              {detailSession && (
                <div className="px-6 pb-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
                      <Hash className="h-3 w-3" /> 턴 {detailSession.turn_count}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
                      <Clock className="h-3 w-3" /> 소요 {formatDuration(detailSession.duration_sec)}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
                      <Type className="h-3 w-3" />
                      사용자 {formatNumber(detailSession.user_chars)}자 / AI {formatNumber(detailSession.assistant_chars)}자
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
                      <Zap className="h-3 w-3" />
                      토큰 {formatNumber(detailSession.user_tokens)} + {formatNumber(detailSession.assistant_tokens)} = {formatNumber(detailSession.total_tokens)}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
                      <Timer className="h-3 w-3" />
                      응답 {detailSession.avg_response_sec > 0 ? formatDuration(detailSession.avg_response_sec) : '-'}
                      {' / '}
                      입력간격 {detailSession.avg_user_interval_sec > 0 ? formatDuration(detailSession.avg_user_interval_sec) : '-'}
                    </div>
                  </div>
                </div>
              )}

              <CardContent>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : detailMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">메시지가 없습니다</div>
                ) : (
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-3 pr-4">
                      {detailMessages.map((msg, idx) => {
                        const timeDiff = getTimeDiff(idx);
                        return (
                          <div key={msg.id}>
                            {/* Time gap indicator */}
                            {timeDiff && (
                              <div className="flex justify-center my-1">
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                  +{timeDiff}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                  msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <div className="whitespace-pre-wrap break-words">
                                  {msg.content.length > 500
                                    ? msg.content.substring(0, 500) + '...'
                                    : msg.content}
                                </div>
                                <div className={`text-[10px] mt-1 flex items-center gap-2 ${
                                  msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}>
                                  <span>{formatDate(msg.created_at)}</span>
                                  <span>{msg.content.length}자</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
