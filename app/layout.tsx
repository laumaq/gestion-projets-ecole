// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header'; // Import du Header

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Portail Waha - Outils Scolaires',
  description: 'Portail des outils pédagogiques',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Header /> {/* Header global */}
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
