// app/tools/tfh/coordination/hooks/useCoordinateurData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve, Guide, LecteurExterne, Mediateur } from '../types';

export function useCoordinateurData() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [lecteursExternes, setLecteursExternes] = useState<LecteurExterne[]>([]);
  const [mediateurs, setMediateurs] = useState<Mediateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCoordinateur, setCurrentCoordinateur] = useState<{nom: string, prenom: string} | null>(null);

  const loadData = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');

      // 1. Charger les guides = tous les employees SAUF direction ET SAUF membres du groupe coordination
      const { data: guidesData, error: guidesError } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale, email, mot_de_passe, job')
        .neq('job', 'direction')
        .not('id', 'in', (
          supabase
            .from('tfh_groupes_travail_membres')
            .select('employee_id')
            .eq('groupe_id', '0092b3db-1f7e-40e1-8f6b-70219d6a50f2')
        ))
        .order('nom', { ascending: true });

      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // 2. Charger les lecteurs externes (table existante)
      const { data: lecteursExternesData, error: lecteursError } = await supabase
        .from('tfh_lecteurs_externes')
        .select('id, nom, prenom, email');

      if (lecteursError) throw lecteursError;
      setLecteursExternes(lecteursExternesData || []);

      // 3. Charger les médiateurs (table existante)
      const { data: mediateursData, error: mediateursError } = await supabase
        .from('tfh_mediateurs')
        .select('id, nom, prenom, email');

      if (mediateursError) {
        setMediateurs([]);
      } else {
        setMediateurs(mediateursData || []);
      }

      // 4. Charger les élèves avec jointures vers employees et tfh_lecteurs_externes
      const { data: elevesData, error: elevesError } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          mediateur_id,
          lecteur_interne_id,
          lecteur_externe_id,
          problematique,
          thematique,
          categorie,
          source_1,
          source_2,
          source_3,
          source_4,
          source_5,
          session_1_convoque,
          session_2_convoque,
          session_3_convoque,
          session_4_convoque,
          session_5_convoque,
          session_6_convoque,
          session_7_convoque,
          session_8_convoque,
          session_9_convoque,
          session_10_convoque,
          session_11_convoque,
          session_12_convoque,
          session_13_convoque,
          session_14_convoque,
          session_15_convoque,
          session_16_convoque,
          session_17_convoque,
          session_18_convoque,
          session_19_convoque,
          session_20_convoque,
          journee_1_present,
          journee_2_present,
          journee_3_present,
          journee_4_present,
          journee_5_present,
          journee_6_present,
          journee_7_present,
          journee_8_present,
          journee_9_present,
          journee_10_present,
          journee_11_present,
          journee_12_present,
          journee_13_present,
          journee_14_present,
          journee_15_present,
          journee_16_present,
          journee_17_present,
          journee_18_present,
          journee_19_present,
          journee_20_present,
          presence_9_mars,
          presence_10_mars,
          presence_16_avril,
          presence_17_avril,
          date_defense,
          heure_defense,
          localisation_defense,
          convocation_mars,
          convocation_avril,
          objectif_particulier,
          created_at,
          updated_at,
          students!inner (nom, prenom, classe, mot_de_passe)
        `)
        .order('students(classe)', { ascending: true })
        .order('students(nom)', { ascending: true });

      if (elevesError) throw elevesError;

      // Formater les élèves avec les noms des relations
      const elevesFormatted: Eleve[] = (elevesData || []).map(eleve => {
        // Récupérer les infos du guide depuis employees
        const guideInfo = guidesData?.find(g => g.id === eleve.guide_id);
        const lecteurInterneInfo = guidesData?.find(g => g.id === eleve.lecteur_interne_id);
        const mediateurInfo = mediateursData?.find(m => m.id === eleve.mediateur_id);
        const lecteurExterneInfo = lecteursExternesData?.find(l => l.id === eleve.lecteur_externe_id);
        
        // Récupérer les infos de l'élève depuis students
        const studentInfo = (eleve as any).students;
        
        return {
          ...eleve,
          id: eleve.student_matricule,
          nom: studentInfo?.nom || '',
          prenom: studentInfo?.prenom || '',
          classe: studentInfo?.classe || '',
          mot_de_passe: studentInfo?.mot_de_passe || null, 
          guide_nom: guideInfo?.nom || '-',
          guide_prenom: guideInfo?.prenom || '-',
          lecteur_interne_nom: lecteurInterneInfo?.nom || '-',
          lecteur_interne_prenom: lecteurInterneInfo?.prenom || '-',
          lecteur_externe_nom: lecteurExterneInfo?.nom || '-',
          lecteur_externe_prenom: lecteurExterneInfo?.prenom || '-',
          mediateur_nom: mediateurInfo?.nom || '-',
          mediateur_prenom: mediateurInfo?.prenom || '-'
        };
      });

      setEleves(elevesFormatted);

      // Extraire les catégories uniques
      const uniqueCategories = Array.from(
        new Set(elevesFormatted.map(e => e.categorie).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      // 5. Charger le coordinateur connecté
      if (userId) {
        const { data: coordinateurData } = await supabase
          .from('employees')
          .select('nom, prenom')
          .eq('id', userId)
          .single();
        
        if (coordinateurData) {
          setCurrentCoordinateur(coordinateurData);
        }
      }

    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = () => {
    setLoading(true);
    loadData();
  };

  const updateEleveLocal = (updatedEleve: Eleve) => {
    setEleves(prev => prev.map(e => 
      e.id === updatedEleve.id ? updatedEleve : e
    ));
  };
  
  return {
    eleves,
    guides,
    lecteursExternes,
    mediateurs,
    currentCoordinateur,
    categories,
    loading,
    refreshData,
    updateEleveLocal
  };
}