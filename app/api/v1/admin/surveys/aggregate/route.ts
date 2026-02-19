import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();
    const paperId = request.nextUrl.searchParams.get('paper_id');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('surveys').select('responses, completed_at');
    if (paperId) query = query.eq('paper_id', paperId);

    const { data, error } = await query;
    if (error) throw error;

    const surveys = data || [];
    const today = new Date().toISOString().split('T')[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todaySurveys = surveys.filter((s: any) => s.completed_at?.startsWith(today)).length;

    // Build distributions
    const distributions: Record<string, Record<string, number>> = {};
    const matrixDistributions: Record<string, Record<string, number>> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const survey of surveys) {
      const responses = survey.responses || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of responses) {
        const qId = r.questionId;
        const val = r.value;
        if (!qId || val === undefined || val === '') continue;

        if (qId === 'q2-2') {
          // Matrix: parse JSON, aggregate per item
          try {
            const matrix = typeof val === 'string' ? JSON.parse(val) : val;
            for (const [item, scale] of Object.entries(matrix)) {
              if (!matrixDistributions[item]) matrixDistributions[item] = {};
              const s = scale as string;
              matrixDistributions[item][s] = (matrixDistributions[item][s] || 0) + 1;
            }
          } catch {
            // ignore parse errors
          }
        } else if (qId === 'q3-3') {
          // Multiple choice: parse JSON array
          try {
            const items = typeof val === 'string' ? JSON.parse(val) : val;
            if (Array.isArray(items)) {
              if (!distributions[qId]) distributions[qId] = {};
              for (const item of items) {
                distributions[qId][item] = (distributions[qId][item] || 0) + 1;
              }
            }
          } catch {
            // ignore parse errors
          }
        } else if (['q3-1', 'q3-2', 'q3-4'].includes(qId)) {
          // Free text - skip distribution, we'll collect separately
        } else {
          // Simple value
          if (!distributions[qId]) distributions[qId] = {};
          distributions[qId][val] = (distributions[qId][val] || 0) + 1;
        }
      }
    }

    // Collect text responses (latest 20)
    const textResponses: Record<string, string[]> = { 'q3-1': [], 'q3-2': [], 'q3-4': [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedSurveys = [...surveys].sort((a: any, b: any) =>
      (b.completed_at || '').localeCompare(a.completed_at || ''));

    for (const survey of sortedSurveys) {
      for (const r of (survey.responses || [])) {
        if (['q3-1', 'q3-2', 'q3-4'].includes(r.questionId) && r.value && textResponses[r.questionId].length < 20) {
          textResponses[r.questionId].push(r.value);
        }
      }
    }

    return successResponse({
      total_surveys: surveys.length,
      today_surveys: todaySurveys,
      distributions,
      matrix_distributions: matrixDistributions,
      text_responses: textResponses,
    });
  } catch (error) {
    console.error('Error:', error);
    return internalErrorResponse('Failed to aggregate surveys');
  }
}
