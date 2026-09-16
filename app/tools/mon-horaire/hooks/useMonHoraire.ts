// app/tools/mon-horaire/hooks/useMonHoraire.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cours } from '../types';
import { trierCours } from '../utils/horaire';

interface UseMonHoraireResult {
  cours: Cours[];
  loading: boolean;
  userName: string;
  userType: 'employee' | 'student' | null;
}

export function useMonHoraire(): UseMonHoraireResult {
  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState<'employee' | 'student' | null>(null);

  useEffect(() => {
    async function load() {
      const userId = localStorage.getItem('userId');
      const type = localStorage.getItem('userType') as 'employee' | 'student' | null;
      const name = localStorage.getItem('userName') || '';
      setUserName(name);
      setUserType(type);

      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        let data: Cours[] = [];

        if (type === 'employee') {
          const { data: d, error } = await supabase
            .from('courses')
            .select('*')
            .like('prof', `%${userId}%`);
          if (error) {
            console.error('❌ Erreur chargement cours prof:', error);
            setLoading(false);
            return;
          }
          data = (d || []) as Cours[];
        } else {
          const matricule = parseInt(userId, 10);

          const { data: sg } = await supabase
            .from('students_groups')
            .select('groupe_code')
            .eq('matricule', matricule);

          const groupes = new Set<string>();
          (sg || []).forEach((g: any) => {
            if (g.groupe_code) groupes.add(g.groupe_code);
          });

          if (groupes.size === 0) {
            setCours([]);
            setLoading(false);
            return;
          }

          // Pagination (limite Supabase = 1000)
          let all: Cours[] = [];
          let from = 0;
          const pageSize = 1000;
          while (true) {
            const { data: d, error } = await supabase
              .from('courses')
              .select('*')
              .range(from, from + pageSize - 1);
            if (error || !d || d.length === 0) break;
            all.push(...(d as Cours[]));
            if (d.length < pageSize) break;
            from += pageSize;
          }

          data = all.filter((c) => {
            const raw = c.raw_pattern || '';
            if (groupes.has(raw)) return true;
            const match = raw.match(/^\[(.+)\]$/);
            if (match && groupes.has(match[1])) return true;
            return false;
          });
        }

        setCours(trierCours(data));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { cours, loading, userName, userType };
}