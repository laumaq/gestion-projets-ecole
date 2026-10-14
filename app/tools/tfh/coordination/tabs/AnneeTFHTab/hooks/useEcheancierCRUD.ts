// app/tools/tfh/coordination/tabs/AnneeTFHTab/hooks/useEcheancierCRUD.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface EcheanceRow {
  id: number;
  date: string;           // format 'YYYY-MM-DD'
  description: string;
  formats: string[];      // keys des types concernés
  last_modified?: string;
}

export interface EcheanceInput {
  date: string;
  description: string;
  formats: string[];
}

export function useEcheancierCRUD() {
  const [echeances, setEcheances] = useState<EcheanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEcheances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tfh_echeancier')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      const rows: EcheanceRow[] = (data || []).map((r: any) => ({
        id: r.id,
        date: r.date,
        description: r.description,
        formats: Array.isArray(r.formats) ? r.formats : [],
        last_modified: r.last_modified,
      }));

      setEcheances(rows);
    } catch (err) {
      console.error('Erreur chargement échéancier:', err);
      setEcheances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEcheances();
  }, [loadEcheances]);

  const createEcheance = useCallback(async (input: EcheanceInput) => {
    const { data, error } = await supabase
      .from('tfh_echeancier')
      .insert({
        date: input.date,
        description: input.description,
        formats: input.formats,
      })
      .select()
      .single();

    if (error) throw error;

    const row: EcheanceRow = {
      id: data.id,
      date: data.date,
      description: data.description,
      formats: Array.isArray(data.formats) ? data.formats : [],
      last_modified: data.last_modified,
    };

    setEcheances(prev =>
      [...prev, row].sort((a, b) => a.date.localeCompare(b.date))
    );

    return row;
  }, []);

  const updateEcheance = useCallback(async (id: number, input: EcheanceInput) => {
    const { data, error } = await supabase
      .from('tfh_echeancier')
      .update({
        date: input.date,
        description: input.description,
        formats: input.formats,
        last_modified: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const row: EcheanceRow = {
      id: data.id,
      date: data.date,
      description: data.description,
      formats: Array.isArray(data.formats) ? data.formats : [],
      last_modified: data.last_modified,
    };

    setEcheances(prev =>
      prev
        .map(e => (e.id === id ? row : e))
        .sort((a, b) => a.date.localeCompare(b.date))
    );

    return row;
  }, []);

  const deleteEcheance = useCallback(async (id: number) => {
    const { error } = await supabase
      .from('tfh_echeancier')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setEcheances(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    echeances,
    loading,
    reload: loadEcheances,
    createEcheance,
    updateEcheance,
    deleteEcheance,
  };
}