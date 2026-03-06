// hooks/useCharteVoyage.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useCharteVoyage(voyageId: string, eleveId: number | null) {
  const [charte, setCharte] = useState<{ contenu: string; version: number } | null>(null);
  const [aAccepte, setAAccepte] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tempsLecture, setTempsLecture] = useState(0);
  const [peutAccepter, setPeutAccepter] = useState(false);

  useEffect(() => {
    if (!eleveId) {
      setLoading(false);
      return;
    }
    loadCharte();
    checkAcceptation();
  }, [voyageId, eleveId]);

  const loadCharte = async () => {
    const { data } = await supabase
      .from('voyage_chartes')
      .select('contenu, version')
      .eq('voyage_id', voyageId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setCharte(data);
    }
    setLoading(false);
  };

  const checkAcceptation = async () => {
    if (!eleveId || !charte) return;

    const { data } = await supabase
      .from('voyage_charte_acceptations')
      .select('id, temps_lecture')
      .eq('voyage_id', voyageId)
      .eq('eleve_id', eleveId)
      .eq('charte_version', charte.version)
      .maybeSingle();

    setAAccepte(!!data);
  };

  // Timer de lecture basé sur la longueur de la charte
  useEffect(() => {
    if (!charte || aAccepte) return;

    // Calcul du temps minimum de lecture (1 sec pour 200 caractères, min 5 sec, max 30 sec)
    const longueur = charte.contenu.length;
    const tempsMinimum = Math.min(Math.max(Math.floor(longueur / 200), 5), 30);
    
    let timer: NodeJS.Timeout;
    let startTime = Date.now();

    timer = setInterval(() => {
      const ecoule = Math.floor((Date.now() - startTime) / 1000);
      setTempsLecture(ecoule);
      if (ecoule >= tempsMinimum) {
        setPeutAccepter(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [charte, aAccepte]);

  const accepterCharte = async () => {
    if (!eleveId || !charte || !peutAccepter) return;

    const { error } = await supabase
      .from('voyage_charte_acceptations')
      .insert({
        voyage_id: voyageId,
        eleve_id: eleveId,
        charte_version: charte.version,
        temps_lecture: tempsLecture,
        ip_address: '', // À remplir côté serveur
        user_agent: navigator.userAgent
      });

    if (!error) {
      setAAccepte(true);
    }
  };

  return { charte, aAccepte, loading, tempsLecture, peutAccepter, accepterCharte };
}