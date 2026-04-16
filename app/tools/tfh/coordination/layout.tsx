// app/tools/tfh/coordination/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TfhCoordinationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      const userType = localStorage.getItem('userType');
      const id = localStorage.getItem('userId');

      if (userType !== 'employee' || !id) {
        router.push('/');
        return;
      }

      const { data: employee, error } = await supabase
        .from('employees')
        .select('groupe_id')
        .eq('id', id)
        .single();

      if (error || !employee || employee.groupe_id !== '0092b3db-1f7e-40e1-8f6b-70219d6a50f2') {
        router.push('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAuthorization();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // Pas de wrapper supplémentaire
  return <>{children}</>;
}