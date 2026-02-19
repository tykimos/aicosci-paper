import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import * as XLSX from 'xlsx';

function flattenSurveyResponses(responses: Array<{questionId: string, value: string}>) {
  const flat: Record<string, string> = {};
  for (const r of responses) {
    flat[r.questionId] = r.value || '';
  }
  return flat;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();
    const format = request.nextUrl.searchParams.get('format') || 'csv';
    const type = request.nextUrl.searchParams.get('type') || 'surveys';
    const paperId = request.nextUrl.searchParams.get('paper_id');

    if (type === 'surveys' || type === 'all') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from('surveys').select('id, paper_id, session_id, responses, completed_at, papers!inner(title)');
      if (paperId) query = query.eq('paper_id', paperId);
      const { data: surveys, error } = await query.order('completed_at', { ascending: false });
      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (surveys || []).map((s: any) => {
        const flat = flattenSurveyResponses(s.responses || []);
        return {
          survey_id: s.id,
          paper_id: s.paper_id,
          paper_title: s.papers?.title || '',
          session_id: s.session_id,
          completed_at: s.completed_at,
          ...flat,
        };
      });

      if (format === 'json') {
        return new Response(JSON.stringify(rows, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="surveys.json"',
          },
        });
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '설문응답');

      if (format === 'xlsx') {
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        return new Response(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="surveys.xlsx"',
          },
        });
      }

      // CSV
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="surveys.csv"',
        },
      });
    }

    if (type === 'papers') {
      const { data: papers, error } = await supabase
        .from('papers')
        .select('id, title, authors, abstract, tags, vote_count, survey_count, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (papers || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        authors: (p.authors || []).join(', '),
        abstract: p.abstract || '',
        tags: (p.tags || []).join(', '),
        vote_count: p.vote_count,
        survey_count: p.survey_count,
        created_at: p.created_at,
      }));

      if (format === 'json') {
        return new Response(JSON.stringify(rows, null, 2), {
          headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="papers.json"' },
        });
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '논문');

      if (format === 'xlsx') {
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        return new Response(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="papers.xlsx"',
          },
        });
      }

      const csv = XLSX.utils.sheet_to_csv(ws);
      return new Response(csv, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="papers.csv"' },
      });
    }

    return new Response('Invalid type', { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return internalErrorResponse('Failed to export data');
  }
}
