// app/tools/tfh/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getTfhDashboardType } from '@/lib/tfh/permissions';

export default function TfhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardType, setDashboardType] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const userType = localStorage.getItem('userType') as 'employee' | 'student';
      const userId = localStorage.getItem('userId');
      const userJob = localStorage.getItem('userJob') || '';

      console.log('TfhLayout checkAccess:', { userType, userId, userJob, pathname });

      if (!userType || !userId) {
        router.push('/');
        return;
      }

      const type = await getTfhDashboardType(userType, userId, userJob);
      console.log('Dashboard type:', type);
      setDashboardType(type);

      if (!type) {
        router.push('/dashboard/main');
        return;
      }

      // Vérifier que l'utilisateur essaie d'accéder à la bonne section
      if (type === 'eleve' && !pathname?.includes('/eleve')) {
        router.push('/tools/tfh/eleve');
        return;
      }
      if (type === 'coordination' && !pathname?.includes('/coordination')) {
        router.push('/tools/tfh/coordination');
        return;
      }
      if (type === 'direction' && !pathname?.includes('/direction')) {
        router.push('/tools/tfh/direction');
        return;
      }
      if (type === 'guide' && !pathname?.includes('/guide')) {
        router.push('/tools/tfh/guide');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router, pathname]);

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