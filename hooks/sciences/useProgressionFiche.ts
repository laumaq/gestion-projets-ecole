// ============================================================
// hooks/sciences/useProgressionFiche.ts
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type FicheEvent = 'attributed' | 'opened' | 'succeeded';

export interface ProgressionFiche {
  attributed_at: string | null;
  opened_at: string | null;
  succeeded_at: string | null;
  score: number | null;
  last_attempt_at: string | null;
  mode: 'normal' | 'advanced' | null;
}

export interface UseProgressionFicheReturn {
  progression: ProgressionFiche | null;
  loading: boolean;
  markOpened: () => Promise<void>;
  markScore: (pct: number) => Promise<void>;
}

export function useProgressionFiche(
  studentId: number | null,
  ficheKey: string
): UseProgressionFicheReturn {
  const [progression, setProgression] = useState<ProgressionFiche | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgression = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    const { data } = await supabase
      .from('fiches_outils_progression')
      .select([
        `${ficheKey}_attributed_at`,
        `${ficheKey}_opened_at`,
        `${ficheKey}_succeeded_at`,
        `${ficheKey}_score`,
        `${ficheKey}_last_attempt_at`,
        `${ficheKey}_mode`,
      ].join(', '))
      .eq('student_id', studentId)
      .maybeSingle();

    if (data) {
      const d = data as unknown as Record<string, string | null>;
      setProgression({
        attributed_at:   d[`${ficheKey}_attributed_at`]   ?? null,
        opened_at:       d[`${ficheKey}_opened_at`]       ?? null,
        succeeded_at:    d[`${ficheKey}_succeeded_at`]    ?? null,
        score:           d[`${ficheKey}_score`] != null ? Number(d[`${ficheKey}_score`]) : null,
        last_attempt_at: d[`${ficheKey}_last_attempt_at`] ?? null,
        mode:            (d[`${ficheKey}_mode`] as 'normal' | 'advanced') ?? null,
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

  const markScore = useCallback(async (pct: number) => {
    if (!studentId) return;
    await supabase.rpc('save_fiche_score', {
      p_student_id: studentId,
      p_fiche: ficheKey,
      p_score: pct,
    });
    await fetchProgression();
  }, [studentId, ficheKey, fetchProgression]);

  return {
    progression,
    loading,
    markOpened:    () => markEvent('opened'),
    markScore,
  };
}