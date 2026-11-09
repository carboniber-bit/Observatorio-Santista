import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { IndependenceBanner } from '@/components/IndependenceBanner';
import { SiteHeader } from '@/components/SiteHeader';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: BRAND_NAME,
  description:
    'Projeto independente sobre a eleição presidencial do Santos Futebol Clube em 2026.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-paper pb-24 text-ink antialiased sm:pb-16">
        <SiteHeader />
        {children}
        <IndependenceBanner />
      </body>
    </html>
  );
}
