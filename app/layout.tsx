import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://aicosci.aifactory.space'),
  title: 'AI-CO-SCI | AI 연구보고서 리뷰 플랫폼',
  description: 'AI가 작성한 연구보고서를 읽고 평가해주세요. 여러분의 리뷰가 AI 과학 연구 발전에 기여합니다.',
  openGraph: {
    siteName: 'AI-CO-SCI',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
