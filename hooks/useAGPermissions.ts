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
  const [agId, setAgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const id = localStorage.getItem('userId');
        const job = localStorage.getItem('userJob');
        
        setUserId(id);
        setUserJob(job);
        setIsDirection(job === 'direction');

        // Récupérer la config AG la plus récente
        const { data: ag, error } = await supabase
          .from('ag_configs')
          .select('id, statut')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter l'erreur si pas de résultat

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur récupération AG:', error);
        }

        if (ag) {
          setAgStatut(ag.statut);
          setAgId(ag.id);

          // Vérifier si l'utilisateur est membre du bureau
          if (id && ag.id) {
            const { data: bureau, error: bureauError } = await supabase
              .from('ag_bureau')
              .select('id')
              .eq('ag_id', ag.id)
              .eq('employee_id', id)
              .maybeSingle();

            if (!bureauError && bureau) {
              setIsBureau(true);
            }
          }
        } else {
          // Pas d'AG configurée
          setAgStatut('pas_ag');
          setAgId(null);
        }
      } catch (error) {
        console.error('Erreur dans useAGPermissions:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  const canConfigure = isDirection || isBureau;
  const canSubmit = agStatut === 'preparation' && !isDirection && !isBureau;
  const canViewPlanning = agStatut === 'planning_etabli';
  const canBuildPlanning = isDirection || isBureau;

  return {
    agStatut,
    agId,
    isDirection,
    isBureau,
    canConfigure,
    canSubmit,
    canViewPlanning,
    canBuildPlanning,
    loading
  };
}
