// app/tools/tfh/eleve/hooks/useDisplaySettings.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DisplaySettings } from '../types';

export function useDisplaySettings() {
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    eleves_voir_guides: false,
    eleves_voir_defenses: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('tfh_system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['eleves_voir_guides', 'eleves_voir_defenses']);

        const settings: DisplaySettings = {
          eleves_voir_guides: false,
          eleves_voir_defenses: false,
        };

        data?.forEach(item => {
          if (item.setting_key === 'eleves_voir_guides') {
            settings.eleves_voir_guides = item.setting_value === 'true';
          } else if (item.setting_key === 'eleves_voir_defenses') {
            settings.eleves_voir_defenses = item.setting_value === 'true';
          }
        });

        setDisplaySettings(settings);
      } catch (err) {
        console.error('Erreur chargement displaySettings:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { displaySettings, loading };
}