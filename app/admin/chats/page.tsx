'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, ArrowUpDown, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
}

interface ChatMessage {
  id: string;
  session_id: string;
  paper_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

type SortField = 'turns' | 'messages' | 'last_chat';

export default function AdminChatsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('last_chat');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail view
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
        setTotal(json.data.total);
      }
    } catch (e) {
      console.error('Failed to fetch chat sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [sortBy, sortOrder]);

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
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            채팅 히스토리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            총 {total}개 채팅 세션
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session list */}
        <div className={selectedSession ? 'lg:col-span-1' : 'lg:col-span-3'}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">채팅 세션 목록</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  채팅 기록이 없습니다
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">세션 ID</TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground"
                            onClick={() => toggleSort('turns')}
                          >
                            턴 수
                            <SortIcon field="turns" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground"
                            onClick={() => toggleSort('messages')}
                          >
                            메시지
                            <SortIcon field="messages" />
                          </button>
                        </TableHead>
                        {!selectedSession && (
                          <>
                            <TableHead>첫 메시지</TableHead>
                            <TableHead>논문</TableHead>
                          </>
                        )}
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground"
                            onClick={() => toggleSort('last_chat')}
                          >
                            마지막 채팅
                            <SortIcon field="last_chat" />
                          </button>
                        </TableHead>
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
                            {s.session_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.turn_count >= 5 ? 'default' : 'secondary'}>
                              {s.turn_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{s.message_count}</TableCell>
                          {!selectedSession && (
                            <>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                {s.first_message || '-'}
                              </TableCell>
                              <TableCell>
                                {s.paper_count > 0 && (
                                  <Badge variant="outline">{s.paper_count}</Badge>
                                )}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedSession(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : detailMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    메시지가 없습니다
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3 pr-4">
                      {detailMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
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
                            <div
                              className={`text-[10px] mt-1 ${
                                msg.role === 'user'
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatDate(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
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
