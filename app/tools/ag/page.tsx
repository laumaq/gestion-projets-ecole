// app/tools/ag/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAGPermissions } from '@/hooks/useAGPermissions';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AGPage() {
  const router = useRouter();
  const { agStatut, canConfigure, canSubmit, canViewPlanning, loading } = useAGPermissions();

  useEffect(() => {
    if (loading) return;

    if (agStatut === 'pas_ag') {
      router.push('/dashboard');
      return;
    }

    if (canConfigure) {
      router.push('/tools/ag/configuration');
    } else if (agStatut === 'preparation' && canSubmit) {
      router.push('/tools/ag/preparation');
    } else if (agStatut === 'planning_etabli' && canViewPlanning) {
      router.push('/tools/ag/planning');
    } else {
      router.push('/dashboard');
    }
  }, [agStatut, canConfigure, canSubmit, canViewPlanning, loading, router]);

  if (loading) return <LoadingSpinner />;
  
  return null;
}
