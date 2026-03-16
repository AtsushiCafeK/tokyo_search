import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '東京都+全市区町村 行政情報 横断検索 | hazimeru.net',
  description: '東京都内すべての市区町村（23区・市町村）と東京都庁の公式Webサイトから、助成金、補助金、手続き、住民票などの行政情報をまとめて素早く検索できる、都民のための横断検索サイトです。',
  keywords: ['東京都', '市区町村', '行政サービス', '補助金', '助成金', '横断検索', '自治体検索', '手続き', '住民票', 'ゴミ出し'],
  authors: [{ name: 'IT Libero' }],
  openGraph: {
    title: '東京都+全市区町村 行政情報 横断検索 | hazimeru.net',
    description: '市区町村と東京都の公式情報をまとめて一括検索',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://hazimeru.net',
    siteName: 'hazimeru.net',
  },
  twitter: {
    card: 'summary_large_image',
    title: '東京都+全市区町村 行政情報 横断検索 | hazimeru.net',
    description: '市区町村と東京都の公式情報をまとめて一括検索',
    creator: '@it_hazimeru',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4XHG3EEXRE"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-4XHG3EEXRE');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}

