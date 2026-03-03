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

    console.log('AG Statut:', agStatut); // Pour debug

    if (agStatut === 'pas_ag') {
      // Si pas d'AG programmée, rediriger vers dashboard avec un message
      router.push('/dashboard?ag=desactivee');
      return;
    }

    if (canConfigure) {
      router.push('/tools/ag/configuration');
    } else if (agStatut === 'preparation' && canSubmit) {
      router.push('/tools/ag/preparation');
    } else if (agStatut === 'planning_etabli' && canViewPlanning) {
      router.push('/tools/ag/planning');
    } else {
      // Par défaut, essayer le planning
      router.push('/tools/ag/planning');
    }
  }, [agStatut, canConfigure, canSubmit, canViewPlanning, loading, router]);

  if (loading) return <LoadingSpinner />;
  
  return null;
}
