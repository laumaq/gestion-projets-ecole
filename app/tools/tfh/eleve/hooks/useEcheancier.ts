// app/tools/tfh/eleve/hooks/useEcheancier.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Echeance {
  id: string;
  date: string;
  description: string;
  formats: string[];
  /** Source de l'échéance — sert à différencier visuellement */
  source: 'echeancier' | 'journee' | 'defense';
}

function toIsoDate(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export function useEcheancier(type: string | null | undefined) {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!type || type.trim() === '') {
      setEcheances([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        // 1. Échéancier manuel (BDD)
        const { data: echeancesData, error: echeancesError } = await supabase
          .from('tfh_echeancier')
          .select('id, date, description, formats')
          .contains('formats', JSON.stringify([type]))
          .order('date', { ascending: true });

        if (echeancesError) throw echeancesError;

        const echeancesBdd: Echeance[] = (echeancesData || []).map(e => ({
          id: `echeancier-${e.id}`,
          date: e.date,
          description: e.description,
          formats: e.formats,
          source: 'echeancier',
        }));

        // 2. Journées de travail (Journee_1 à Journee_20)
        const { data: journeesData } = await supabase
          .from('tfh_system_settings')
          .select('setting_key, setting_value, description')
          .like('setting_key', 'Journee_%')
          .not('setting_key', 'like', 'Journee_defense_%');

        const journeesEcheances: Echeance[] = (journeesData || [])
          .map(j => {
            const date = toIsoDate(j.setting_value);
            if (!date) return null;
            const num = j.setting_key.replace('Journee_', '');
            const echeance: Echeance = {
              id: `journee-${j.setting_key}`,
              date,
              description: j.description || `Journée de travail TFH #${num}`,
              formats: ['traditionnel', 'stage', 'atelier', 'chefdoeuvre'],
              source: 'journee',
            };
            return echeance;
          })
          .filter((x): x is Echeance => x !== null);

        // 3. Journées de défense (Journee_defense_1 à N)
        const { data: defensesData } = await supabase
          .from('tfh_system_settings')
          .select('setting_key, setting_value, description')
          .like('setting_key', 'Journee_defense_%');

        const defensesEcheances: Echeance[] = (defensesData || [])
          .map(d => {
            const date = toIsoDate(d.setting_value);
            if (!date) return null;
            const num = d.setting_key.replace('Journee_defense_', '');
            const echeance: Echeance = {
              id: `defense-${d.setting_key}`,
              date,
              description: d.description || `Défense TFH (journée ${num})`,
              formats: ['traditionnel', 'stage', 'atelier', 'chefdoeuvre'],
              source: 'defense',
            };
            return echeance;
          })
          .filter((x): x is Echeance => x !== null);

        // 4. Fusion + tri par date
        const merged = [
          ...echeancesBdd,
          ...journeesEcheances,
          ...defensesEcheances,
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (!cancelled) setEcheances(merged);
      } catch (err) {
        console.error('Erreur chargement échéancier:', err);
        if (!cancelled) setEcheances([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [type]);

  return { echeances, loading };
}