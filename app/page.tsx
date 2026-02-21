import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import HomePage from '@/components/home-page';

interface Props {
  searchParams: Promise<{ paper?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const paperId = params.paper;

  const base: Metadata = {
    title: 'AI-CO-SCI | AI 연구보고서 리뷰 플랫폼',
    description: 'AI가 작성한 연구보고서를 읽고 평가해주세요. 여러분의 리뷰가 AI 과학 연구 발전에 기여합니다.',
    openGraph: {
      siteName: 'AI-CO-SCI',
      type: 'website',
      images: [{ url: '/logo.png', width: 512, height: 512 }],
    },
  };

  if (!paperId) return base;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('papers')
      .select('title, abstract, tags, survey_count')
      .eq('id', paperId)
      .is('deleted_at', null)
      .single();

    const paper = data as { title: string; abstract?: string; tags?: string[]; survey_count?: number } | null;
    if (!paper) return base;

    const title = paper.title;
    const description =
      paper.abstract?.slice(0, 160) ||
      [paper.tags?.join(', '), 'AI-CO-SCI'].filter(Boolean).join(' | ');

    return {
      title: `${title} | AI-CO-SCI`,
      description,
      openGraph: {
        title,
        description,
        siteName: 'AI-CO-SCI',
        type: 'article',
        images: [
          {
            url: `/api/og?paper=${paperId}`,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`/api/og?paper=${paperId}`],
      },
    };
  } catch {
    return base;
  }
}

export default async function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
