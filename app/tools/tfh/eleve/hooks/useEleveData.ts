// app/tools/tfh/eleve/hooks/useEleveData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getJourneesFromSupabase, detecterSessions } from '../../coordination/utils/sessionUtils';
import { EleveInfo, DisplaySettings } from '../types';

interface UseEleveDataReturn {
  eleve: EleveInfo | null;
  loading: boolean;
  phasePreparatoire: boolean;
  objectifGeneral: string;
  objectifParticulier: string;
  autorisationModification: boolean;
  refresh: () => Promise<void>;
  updateField: (field: string, value: any) => Promise<void>;
}

export function useEleveData(matricule: number | null): UseEleveDataReturn {
  const [eleve, setEleve] = useState<EleveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [phasePreparatoire, setPhasePreparatoire] = useState(false);
  const [objectifGeneral, setObjectifGeneral] = useState('');
  const [objectifParticulier, setObjectifParticulier] = useState('');
  const [autorisationModification, setAutorisationModification] = useState(true);

  const loadPhasePreparatoire = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'phase_preparatoire')
        .maybeSingle();

      if (data) {
        setPhasePreparatoire(data.setting_value === 'true');
      }
    } catch (err) {
      console.error('Erreur chargement phase préparatoire:', err);
    }
  }, []);

  const loadEleve = useCallback(async (mat: number) => {
    try {
      const { data, error } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          type,
          problematique,
          thematique,
          description,
          categorie,
          source_1,
          source_2,
          source_3,
          source_4,
          source_5,
          objectif_particulier,
          date_defense,
          heure_defense,
          localisation_defense,
          guide_id,
          mediateur_id,
          lecteur_interne_id,
          lecteur_externe_id,
          url_tfh,
          journal,
          session_1_convoque, session_2_convoque, session_3_convoque,
          session_4_convoque, session_5_convoque, session_6_convoque,
          session_7_convoque, session_8_convoque, session_9_convoque,
          session_10_convoque, session_11_convoque, session_12_convoque,
          session_13_convoque, session_14_convoque, session_15_convoque,
          session_16_convoque, session_17_convoque, session_18_convoque,
          session_19_convoque, session_20_convoque,
          students!inner (nom, prenom, classe)
        `)
        .eq('student_matricule', mat)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLoading(false);
        return;
      }

      const studentInfo = (data as any).students;

      // Settings d'affichage
      const { data: settingsData } = await supabase
        .from('tfh_system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['eleves_voir_guides', 'eleves_voir_defenses']);

      const displaySettings: DisplaySettings = {
        eleves_voir_guides: false,
        eleves_voir_defenses: false,
      };
      settingsData?.forEach(s => {
        if (s.setting_key === 'eleves_voir_guides') displaySettings.eleves_voir_guides = s.setting_value === 'true';
        if (s.setting_key === 'eleves_voir_defenses') displaySettings.eleves_voir_defenses = s.setting_value === 'true';
      });

      // Guide
      let guide_nom = '', guide_prenom = '', guide_initiale = '', guide_accepte_numerique = false;
      if (data.guide_id) {
        const { data: guide } = await supabase
          .from('employees')
          .select('nom, prenom, initiale, tfh_accepte_numerique')
          .eq('id', data.guide_id)
          .single();
        if (guide) {
          guide_nom = guide.nom || '';
          guide_prenom = guide.prenom || '';
          guide_initiale = guide.initiale || '';
          guide_accepte_numerique = guide.tfh_accepte_numerique || false;
        }
      }

      // Médiateur
      let mediateur_nom = '', mediateur_prenom = '', mediateur_accepte_numerique = false;
      if (data.mediateur_id) {
        const { data: mediateur } = await supabase
          .from('tfh_externes')
          .select('nom, prenom, tfh_accepte_numerique')
          .eq('mediateur_id', data.mediateur_id)
          .single();
        if (mediateur) {
          mediateur_nom = mediateur.nom || '';
          mediateur_prenom = mediateur.prenom || '';
          mediateur_accepte_numerique = mediateur.tfh_accepte_numerique || false;
        }
      }

      // Lecteur interne
      let lecteur_interne_nom = '', lecteur_interne_initiale = '', lecteur_interne_accepte_numerique = false;
      if (data.lecteur_interne_id) {
        const { data: li } = await supabase
          .from('employees')
          .select('nom, initiale, tfh_accepte_numerique')
          .eq('id', data.lecteur_interne_id)
          .single();
        if (li) {
          lecteur_interne_nom = li.nom || '';
          lecteur_interne_initiale = li.initiale || '';
          lecteur_interne_accepte_numerique = li.tfh_accepte_numerique || false;
        }
      }

      // Lecteur externe
      let lecteur_externe_nom = '', lecteur_externe_prenom = '', lecteur_externe_accepte_numerique = false;
      if (data.lecteur_externe_id) {
        const { data: le } = await supabase
          .from('tfh_externes')
          .select('nom, prenom, tfh_accepte_numerique')
          .eq('lecteur_externe_id', data.lecteur_externe_id)
          .single();
        if (le) {
          lecteur_externe_nom = le.nom || '';
          lecteur_externe_prenom = le.prenom || '';
          lecteur_externe_accepte_numerique = le.tfh_accepte_numerique || false;
        }
      }

      // Sessions
      const journeesData = await getJourneesFromSupabase();
      const sessionsDetectees = detecterSessions(journeesData);
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);

      const sessionsAvecDates = sessionsDetectees.map(session => {
        const match = session.id.match(/session_(\d+)/);
        const index = match ? parseInt(match[1]) : 0;
        const columnName = `session_${index}_convoque` as keyof typeof data;
        const statut = (data[columnName] as string) || '';
        const dateDebut = session.date_debut instanceof Date ? session.date_debut : new Date(session.date_debut);
        return { index, nom: session.nom, date_debut: dateDebut, statut };
      });

      const sessionsAVenir = sessionsAvecDates.filter(s => s.date_debut >= aujourdhui);

      const formatHeure = (heure: string): string => {
        if (!heure) return '';
        const match = heure.match(/^(\d{1,2}):(\d{2})/);
        return match ? `${match[1]}h${match[2]}` : heure;
      };

      const eleveFormate: EleveInfo = {
        student_matricule: data.student_matricule,
        nom: studentInfo?.nom || '',
        prenom: studentInfo?.prenom || '',
        classe: studentInfo?.classe || '',
        type: data.type || '',
        problematique: data.problematique || '',
        thematique: data.thematique || '',
        description: data.description || '',
        source_1: data.source_1 || '',
        source_2: data.source_2 || '',
        source_3: data.source_3 || '',
        source_4: data.source_4 || '',
        source_5: data.source_5 || '',
        categorie: data.categorie || '',
        guide_nom,
        guide_prenom,
        guide_initiale,
        guide_accepte_numerique,
        journal: data.journal || [],
        sessions: sessionsAVenir,
        defense: {
          date: data.date_defense || '',
          heure: data.heure_defense ? formatHeure(data.heure_defense) : '',
          localisation: data.localisation_defense || '',
          mediateur_nom,
          mediateur_prenom,
          mediateur_accepte_numerique,
          lecteur_interne_nom,
          lecteur_interne_initiale,
          lecteur_interne_accepte_numerique,
          lecteur_externe_nom,
          lecteur_externe_prenom,
          lecteur_externe_accepte_numerique,
        },
        displaySettings,
        url_tfh: data.url_tfh || '',
      };

      setEleve(eleveFormate);
      setObjectifParticulier(data.objectif_particulier || '');

      // Objectif général
      const { data: og } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'objectif_general_tfh')
        .maybeSingle();
      if (og) setObjectifGeneral(og.setting_value || '');

      // Autorisation modification
      const { data: auth } = await supabase
        .from('tfh_system_settings')
        .select('setting_value')
        .eq('setting_key', 'autorisation_modification_problematique')
        .maybeSingle();
      if (auth) setAutorisationModification(auth.setting_value === 'true');

    } catch (err) {
      console.error('Erreur chargement élève:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (matricule) {
      loadPhasePreparatoire();
      loadEleve(matricule);
    }
  }, [matricule, loadPhasePreparatoire, loadEleve]);

  const refresh = useCallback(async () => {
    if (matricule) {
      await loadEleve(matricule);
    }
  }, [matricule, loadEleve]);

  const updateField = useCallback(async (field: string, value: any) => {
    if (!eleve) return;
    try {
      await supabase
        .from('tfh_eleves')
        .update({ [field]: value })
        .eq('student_matricule', eleve.student_matricule);
      setEleve(prev => prev ? { ...prev, [field]: value } : null);
    } catch (err) {
      console.error(`Erreur sauvegarde ${field}:`, err);
    }
  }, [eleve]);

  return {
    eleve,
    loading,
    phasePreparatoire,
    objectifGeneral,
    objectifParticulier,
    autorisationModification,
    refresh,
    updateField,
  };
}