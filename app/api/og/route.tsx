import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Fetch and cache the Noto Sans KR font for Korean text
const notoSansKR = fetch(
  'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLQ.ttf'
).then((res) => res.arrayBuffer());

const notoSansKRBold = fetch(
  'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01eLQ.ttf'
).then((res) => res.arrayBuffer());

export async function GET(request: NextRequest) {
  const paperId = request.nextUrl.searchParams.get('paper');

  const [fontRegular, fontBold] = await Promise.all([notoSansKR, notoSansKRBold]);

  // Default OG image (no paper specified)
  if (!paperId) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontFamily: '"Noto Sans KR"',
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: '#0f172a' }}>
            AI-CO-SCI
          </div>
          <div style={{ fontSize: 28, color: '#64748b', marginTop: 16 }}>
            AI 연구보고서 리뷰 플랫폼
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'Noto Sans KR', data: fontRegular, weight: 400 },
          { name: 'Noto Sans KR', data: fontBold, weight: 700 },
        ],
      }
    );
  }

  // Fetch paper data
  type PaperOG = { title: string; tags: string[]; survey_count: number; authors: string[] };
  let paper: PaperOG | null = null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('papers')
      .select('title, tags, survey_count, authors')
      .eq('id', paperId)
      .is('deleted_at', null)
      .single();
    paper = data as PaperOG | null;
  } catch {
    // Fall through to default
  }

  if (!paper) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontFamily: '"Noto Sans KR"',
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: '#0f172a' }}>
            AI-CO-SCI
          </div>
          <div style={{ fontSize: 28, color: '#64748b', marginTop: 16 }}>
            연구보고서를 찾을 수 없습니다
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'Noto Sans KR', data: fontRegular, weight: 400 },
          { name: 'Noto Sans KR', data: fontBold, weight: 700 },
        ],
      }
    );
  }

  // Truncate title if too long
  const title = paper.title.length > 120 ? paper.title.slice(0, 117) + '...' : paper.title;
  const tags = (paper.tags || []).slice(0, 4);
  const surveyCount = paper.survey_count || 0;
  const surveyText = surveyCount > 0 ? `설문 ${surveyCount}명 참여` : '';
  const titleFontSize = title.length > 60 ? 36 : 44;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Noto Sans KR"',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          padding: '48px 64px',
        }}
      >
        {/* Header: Logo + Brand */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#334155', marginLeft: 16 }}>
            AI-CO-SCI
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#94a3b8',
              marginLeft: 16,
              padding: '4px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
            }}
          >
            연구보고서 리뷰
          </div>
        </div>

        {/* Thick divider */}
        <div
          style={{
            width: '100%',
            height: 4,
            background: '#0f172a',
            marginTop: 32,
            borderRadius: 2,
          }}
        />

        {/* Title */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.3,
              textAlign: 'center',
            }}
          >
            {title}
          </div>
        </div>

        {/* Thin divider */}
        <div
          style={{
            width: '100%',
            height: 1,
            background: '#cbd5e1',
            marginBottom: 24,
          }}
        />

        {/* Bottom: Tags + Stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Tags */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {tags.map((tag: string, i: number) => (
              <div
                key={tag}
                style={{
                  fontSize: 16,
                  color: '#6366f1',
                  background: '#eef2ff',
                  padding: '6px 16px',
                  borderRadius: 16,
                  fontWeight: 500,
                  marginLeft: i > 0 ? 8 : 0,
                }}
              >
                {`#${tag}`}
              </div>
            ))}
          </div>

          {/* Stats + URL */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {surveyText !== '' && (
              <div style={{ fontSize: 16, color: '#64748b', marginRight: 24 }}>
                {surveyText}
              </div>
            )}
            <div style={{ fontSize: 16, color: '#94a3b8', fontWeight: 500 }}>
              aicosci.aifactory.space
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Noto Sans KR', data: fontRegular, weight: 400 },
        { name: 'Noto Sans KR', data: fontBold, weight: 700 },
      ],
    }
  );
}
