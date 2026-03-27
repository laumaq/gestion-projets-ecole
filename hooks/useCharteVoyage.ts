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
    
    const loadData = async () => {
      // 1. Charger la charte
      const { data: charteData } = await supabase
        .from('voyage_chartes')
        .select('contenu, version')
        .eq('voyage_id', voyageId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      console.log('📜 loadCharte - data:', charteData);

      if (charteData) {
        setCharte(charteData);
        
        // 2. Vérifier l'acceptation de CETTE version
        const { data: acceptData } = await supabase
          .from('voyage_charte_acceptations')
          .select('id')
          .eq('voyage_id', voyageId)
          .eq('eleve_id', eleveId)
          .eq('charte_version', charteData.version)
          .maybeSingle();

        console.log('📜 acceptData:', acceptData);
        setAAccepte(!!acceptData);
      }
      setLoading(false);
    };

    loadData();
  }, [voyageId, eleveId]);

  // Timer de lecture - ne démarre que si charte est chargé ET non accepté
  useEffect(() => {
    if (!charte || aAccepte) return;

    const longueur = charte.contenu.length;
    const tempsMinimum = Math.min(Math.max(Math.floor(longueur / 200), 5), 30);
    
    let startTime = Date.now();
    let interval: NodeJS.Timeout;

    interval = setInterval(() => {
      const ecoule = Math.floor((Date.now() - startTime) / 1000);
      setTempsLecture(ecoule);
      if (ecoule >= tempsMinimum) {
        setPeutAccepter(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
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
        user_agent: navigator.userAgent
      });

    if (!error) {
      setAAccepte(true);
    } else {
      console.error('Erreur acceptation charte:', error);
    }
  };

  return { charte, aAccepte, loading, tempsLecture, peutAccepter, accepterCharte };
}