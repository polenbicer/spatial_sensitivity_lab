import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spatial-sensitivity-lab.vercel.app';
const siteTitle = 'Spatial Sensitivity Lab | Urban Cooling and AI Governance';
const siteDescription =
  'Who Gets Prioritised? A research demonstrator examining the democratic legitimacy of data-driven urban cooling decisions in Brussels and Amsterdam.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Spatial Sensitivity Lab',
  title: siteTitle,
  description: siteDescription,
  keywords: [
    'urban heat policy',
    'urban cooling policy',
    'urban heat inequality',
    'climate justice',
    'environmental justice',
    'heat vulnerability',
    'neighbourhood cooling',
    'spatial decision support',
    'AI governance',
    'Brussels urban heat',
    'Amsterdam urban heat',
  ],
  authors: [{ name: 'Polen Biçer', url: 'https://polenbicer.dev' }],
  creator: 'Polen Biçer',
  publisher: 'Polen Biçer',
  category: 'Urban Studies',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: 'Spatial Sensitivity Lab',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Spatial Sensitivity Lab',
  alternateName: 'Who Gets Prioritised? The Democratic Legitimacy of Data-Driven Urban Cooling Decisions in Brussels and Amsterdam',
  url: siteUrl,
  description: siteDescription,
  applicationCategory: 'ResearchApplication',
  operatingSystem: 'Any',
  inLanguage: 'en',
  author: {
    '@type': 'Person',
    name: 'Polen Biçer',
    url: 'https://polenbicer.dev',
  },
  about: [
    { '@type': 'Thing', name: 'Urban heat policy' },
    { '@type': 'Thing', name: 'Climate justice' },
    { '@type': 'Thing', name: 'Environmental justice' },
    { '@type': 'Thing', name: 'AI-supported spatial decision making' },
  ],
  spatialCoverage: ['Brussels', 'Amsterdam'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
