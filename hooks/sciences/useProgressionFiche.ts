// ============================================================
// hooks/useProgressionFiche.ts
// Hook réutilisable pour toutes les fiches-outils
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type FicheEvent = 'attributed' | 'opened' | 'succeeded';

export interface ProgressionFiche {
  attributed_at: string | null;
  opened_at: string | null;
  succeeded_at: string | null;
}

export interface UseProgressionFicheReturn {
  progression: ProgressionFiche | null;
  loading: boolean;
  markOpened: () => Promise<void>;
  markSucceeded: () => Promise<void>;
}

/**
 * @param studentId  matricule de l'élève connecté (parseInt du localStorage userId)
 * @param ficheKey   ex: 'unites', 'grandeurs'  — doit correspondre aux colonnes SQL
 */
export function useProgressionFiche(
  studentId: number | null,
  ficheKey: string
): UseProgressionFicheReturn {
  const [progression, setProgression] = useState<ProgressionFiche | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgression = useCallback(async () => {
      if (!studentId) return;
      const { data } = await supabase
        .from('fiches_outils_progression')
        .select(`${ficheKey}_attributed_at, ${ficheKey}_opened_at, ${ficheKey}_succeeded_at`)
        .eq('student_id', studentId)
        .maybeSingle();

      if (data) {
        const d = data as unknown as Record<string, string | null>;
        setProgression({
          attributed_at: d[`${ficheKey}_attributed_at`] ?? null,
          opened_at:     d[`${ficheKey}_opened_at`]     ?? null,
          succeeded_at:  d[`${ficheKey}_succeeded_at`]  ?? null,
        });
      }
      setLoading(false);
    }, [studentId, ficheKey]);

  useEffect(() => { fetchProgression(); }, [fetchProgression]);

  const markEvent = useCallback(async (event: FicheEvent) => {
    if (!studentId) return;
    await supabase.rpc('upsert_fiche_progression', {
      p_student_id: studentId,
      p_fiche: ficheKey,
      p_event: event,
    });
    await fetchProgression();
  }, [studentId, ficheKey, fetchProgression]);

  return {
    progression,
    loading,
    markOpened:    () => markEvent('opened'),
    markSucceeded: () => markEvent('succeeded'),
  };
}