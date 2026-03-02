// hooks/useAGPermissions.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAGPermissions() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userJob, setUserJob] = useState<string | null>(null);
  const [isDirection, setIsDirection] = useState(false);
  const [isBureau, setIsBureau] = useState(false);
  const [agStatut, setAgStatut] = useState<'pas_ag' | 'preparation' | 'planning_etabli'>('pas_ag');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      const id = localStorage.getItem('userId');
      const job = localStorage.getItem('userJob');
      
      setUserId(id);
      setUserJob(job);
      setIsDirection(job === 'direction');

      // Récupérer le statut de l'AG en cours
      const { data: ag } = await supabase
        .from('ag_configs')
        .select('statut')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (ag) {
        setAgStatut(ag.statut);
      }

      // Vérifier si l'utilisateur est membre du bureau
      if (id && ag?.id) {
        const { data: bureau } = await supabase
          .from('ag_bureau')
          .select('id')
          .eq('ag_id', ag.id)
          .eq('employee_id', id)
          .single();

        setIsBureau(!!bureau);
      }

      setLoading(false);
    };

    checkPermissions();
  }, []);

  const canConfigure = isDirection || isBureau;
  const canSubmit = agStatut === 'preparation' && !isDirection && !isBureau; // Les membres du bureau ne soumettent pas
  const canViewPlanning = agStatut === 'planning_etabli';
  const canBuildPlanning = isDirection || isBureau;

  return {
    agStatut,
    isDirection,
    isBureau,
    canConfigure,
    canSubmit,
    canViewPlanning,
    canBuildPlanning,
    loading
  };
}
