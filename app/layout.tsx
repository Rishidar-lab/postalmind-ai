import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PostalMind AI — India Post GDS Assistant',
  description:
    'AI assistance for GDS Branch Postmasters — GDS CE Rules, RTI drafting, BO workflows, and financial services guidance. Powered by Google Gemini.',
  keywords: ['India Post', 'GDS', 'GDS CE Rules 2020', 'RTI', 'Branch Office', 'IPPB', 'PostalMind', 'AI assistant'],
  authors: [{ name: 'RISHIDAR D.', url: 'https://rishidar-lab.github.io/postalmind-ai/' }],
  openGraph: {
    title: 'PostalMind AI — India Post GDS Assistant',
    description: 'AI companion for 1.5L+ GDS officers. Instant answers on CE Rules, RTI, BO workflows, and financial services.',
    url: 'https://postalmind-ai.vercel.app',
    siteName: 'PostalMind AI',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: 'https://postalmind-ai.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PostalMind AI — India Post GDS Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PostalMind AI — India Post GDS Assistant',
    description: 'AI companion for 1.5L+ GDS officers. Instant answers on CE Rules, RTI, BO workflows, and financial services.',
    images: ['https://postalmind-ai.vercel.app/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://postalmind-ai.vercel.app' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
