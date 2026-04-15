// app/tools/tfh/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTfhDashboardType } from '@/lib/tfh/permissions';

export default function TfhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const userType = localStorage.getItem('userType') as 'employee' | 'student';
      const userId = localStorage.getItem('userId');
      const userJob = localStorage.getItem('userJob') || '';

      if (!userType || !userId) {
        router.push('/');
        return;
      }

      const dashboardType = await getTfhDashboardType(userType, userId, userJob);
      
      if (!dashboardType) {
        router.push('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}