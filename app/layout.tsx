import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ServiceWorkerRegister } from '@/components/sw-register';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://postalmind-ai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PostalMind AI — Ground reality. Verified.',
    template: '%s — PostalMind AI',
  },
  description:
    'Independent, evidence-grounded knowledge, workplace-evidence analysis and practical tools built around the working reality of Gramin Dak Sevaks. Not affiliated with India Post.',
  keywords: ['GDS', 'Gramin Dak Sevak', 'India Post', 'evidence', 'TRCA', 'RTI', 'GDS CE Rules 2020'],
  authors: [{ name: 'RISHIDAR D.' }],
  openGraph: {
    title: 'PostalMind AI — Ground reality. Verified.',
    description:
      'Evidence-grounded knowledge and workplace-evidence tools for Gramin Dak Sevaks. Independent project.',
    url: SITE_URL,
    siteName: 'PostalMind AI',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'PostalMind AI', description: 'Ground reality. Verified.' },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'PostalMind AI' },
};

export const viewport: Viewport = {
  themeColor: '#1f3a5f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <ServiceWorkerRegister />
        <SiteHeader />
        <p className="disclaimer-strip">
          Independent project. Not affiliated with or endorsed by India Post or the Department of Posts.
        </p>
        <main id="main" className="container-page py-8 sm:py-10">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
