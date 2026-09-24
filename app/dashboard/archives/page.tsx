// /app/dashboard/archives/page.tsx

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ArchivesPage() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) router.push('/');
  }, [router]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">📦 Archives</h1>
      <p className="text-gray-600 mb-8">
        Accédez aux archives des outils auxquels vous avez participé
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/archives/voyages" className="block">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">✈️</span>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-1">Archives Voyages</h2>
            <p className="text-sm text-gray-500">
              Voyages terminés et archivés auxquels vous avez participé
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}