// app/tools/tfh/coordination/hooks/useTypesTFH.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TypeTFHDisplay } from '../types';

export function useTypesTFH(enabled: boolean = true) {
  const [typesDisponibles, setTypesDisponibles] = useState<TypeTFHDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tfh_system_settings')
          .select('setting_key, setting_value')
          .like('setting_key', 'tfh_type_%');

        if (error) throw error;

        const typesMap: Record<string, TypeTFHDisplay> = {};

        data?.forEach(item => {
          const match = item.setting_key.match(/tfh_type_([^_]+)_(.+)/);
          if (match) {
            const typeKey = match[1];
            const field = match[2];

            if (!typesMap[typeKey]) {
              typesMap[typeKey] = {
                key: typeKey,
                label: typeKey.charAt(0).toUpperCase() + typeKey.slice(1),
                description: '',
                icon: 'BookOpen',
                color: 'bg-gray-100 text-gray-700 border-gray-200',
              };
            }

            if (field === 'label') typesMap[typeKey].label = item.setting_value;
            else if (field === 'description') typesMap[typeKey].description = item.setting_value;
            else if (field === 'icon') typesMap[typeKey].icon = item.setting_value;
            else if (field === 'color') typesMap[typeKey].color = item.setting_value;
          }
        });

        setTypesDisponibles(Object.values(typesMap));
      } catch (err) {
        console.error('Erreur chargement types:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [enabled]);

  return { typesDisponibles, loading };
}