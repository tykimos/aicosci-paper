// Survey text-to-number mappings - EXACT values from components/layout/survey-sidebar.tsx
export const SURVEY_VALUE_MAPS: Record<string, Record<string, number>> = {
  'q2-1': { '매우 우수함': 5, '우수함': 4, '보통': 3, '다소 미흡': 2, '매우 미흡': 1 },
  'q2-3': { '매우 그렇다': 5, '어느 정도 그렇다': 4, '보통이다': 3, '별로 그렇지 않다': 2, '전혀 그렇지 않다': 1 },
  'q2-4': { '매우 높다': 5, '어느 정도 있다': 4, '잘 모르겠다': 3, '낮다': 2, '매우 낮다': 1 },
  'q2-5': { '적극 추천': 4, '추천할 만함': 3, '보통': 2, '추천하지 않음': 1 },
  'q2-2': { '매우 그렇다': 5, '그렇다': 4, '보통': 3, '아니다': 2, '전혀 아니다': 1 },
};

// Extract numeric value from survey response text
export function getSurveyNumericValue(questionId: string, textValue: string): number | null {
  const map = SURVEY_VALUE_MAPS[questionId];
  if (!map) return null;
  return map[textValue] ?? null;
}

// Extract a specific question's value from survey responses array
export function getResponseValue(
  responses: Array<{ questionId: string; value: string }>,
  questionId: string
): string | undefined {
  return responses?.find((r) => r.questionId === questionId)?.value;
}

// Paginated fetch helper for Supabase large tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllRows<T = Record<string, unknown>>(
  queryBuilder: any,
  pageSize = 1000
): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await queryBuilder.range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return allRows;
}

// Min-max normalize an array of numbers to 0-1 range
export function minMaxNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

// Compute cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

// Compute centroid (element-wise average) of multiple vectors
export function computeCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const centroid = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += vec[i];
    }
  }
  return centroid.map((v) => v / vectors.length);
}

// Pearson correlation coefficient
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2 || n !== y.length) return 0;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Standard deviation
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
