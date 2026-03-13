// app/tools/sciences/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SciencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userType, setUserType] = useState<'employee' | 'student' | null>(null);
  const [userJob, setUserJob] = useState('');

  useEffect(() => {
    const type = localStorage.getItem('userType') as 'employee' | 'student' | null;
    const id = localStorage.getItem('userId');

    if (!type || !id) {
      router.push('/');
      return;
    }

    setUserType(type);
    setUserJob(localStorage.getItem('userJob') || '');
  }, [router]);

  if (!userType) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation spécifique sciences */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-4">
            <Link 
              href="/tools/sciences" 
              className="text-gray-700 hover:text-green-600 font-medium"
            >
              📊 Expériences
            </Link>
            <Link 
              href="/tools/sciences/simulateur" 
              className="text-gray-700 hover:text-green-600 font-medium"
            >
              ⚡ Simulateur de circuits
            </Link>
            {userType === 'employee' && (
              <Link 
                href="/tools/sciences/nouvelle-experience" 
                className="text-gray-700 hover:text-green-600 font-medium"
              >
                ➕ Nouvelle expérience
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}