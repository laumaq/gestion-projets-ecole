// app/tools/tfh/coordination/hooks/useCoordinateurData.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve, Guide, Externe } from '../types';

// Groupe coordination TFH (à exclure des calculs d'implication)
const GROUPE_COORDINATION_TFH = '0092b3db-1f7e-40e1-8f6b-70219d6a50f2';

// Type pour les demandes de changement de rôle
export interface DemandeChangementRole {
  id: string;
  demandeur_id: string;
  demandeur_type: 'guide' | 'externe';
  demandeur_nom: string;
  demandeur_prenom: string;
  demandeur_email: string;
  student_matricule: number;
  eleve_nom: string;
  eleve_prenom: string;
  eleve_classe: string;
  role_type: 'lecteur_interne' | 'lecteur_externe' | 'mediateur';
  defense_date: string;
  defense_horaire: string;
  defense_localisation: string;
  statut: 'en_attente' | 'approuvee' | 'rejetee' | 'annulee';
  commentaire_demandeur: string | null;
  commentaire_coordinateur: string | null;
  created_at: string;
  traitee_le: string | null;
  traitee_par: string | null;
}

// Type pour tous les employees (utilisé pour les stats d'implication)
export interface EmployeeBasic {
  id: string;
  job: string;
  groupe_id: string | null;
}

export function useCoordinateurData() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [externes, setExternes] = useState<Externe[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeBasic[]>([]);
  const [demandesEnAttente, setDemandesEnAttente] = useState<DemandeChangementRole[]>([]);
  const [demandesTraitees, setDemandesTraitees] = useState<DemandeChangementRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCoordinateur, setCurrentCoordinateur] = useState<{nom: string, prenom: string, id: string} | null>(null);
  const isMounted = useRef(false);

  const loadDemandes = useCallback(async () => {
    try {
      // Demandes en attente
      const { data: enAttente, error: error1 } = await supabase
        .from('tfh_demandes_changement_role')
        .select('*')
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false });

      if (!error1) {
        setDemandesEnAttente(enAttente || []);
      }

      // Demandes traitées (30 derniers jours)
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);

      const { data: traitees, error: error2 } = await supabase
        .from('tfh_demandes_changement_role')
        .select('*')
        .in('statut', ['approuvee', 'rejetee'])
        .gte('traitee_le', dateLimite.toISOString())
        .order('traitee_le', { ascending: false });

      if (!error2) {
        setDemandesTraitees(traitees || []);
      }

    } catch (err) {
      console.error('Erreur chargement demandes:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');

      // 1. Charger les guides = tous les employees SAUF direction ET SAUF membres du groupe coordination
      const { data: guidesData, error: guidesError } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale, email, mot_de_passe, job, tfh_accepte_numerique')
        .neq('job', 'direction')
        .order('nom', { ascending: true });

      if (guidesError) throw guidesError;
      setGuides(guidesData || []);

      // 1bis. Charger TOUS les employees (prof/educ/direction/administration)
      //       sauf le groupe coordination → pour les stats d'implication
      const { data: allEmpData, error: allEmpError } = await supabase
        .from('employees')
        .select('id, job, groupe_id')
        .in('job', ['prof', 'educ', 'direction', 'administration'])
        .neq('groupe_id', GROUPE_COORDINATION_TFH);

      if (allEmpError) {
        console.error('Erreur chargement employees:', allEmpError);
        setAllEmployees([]);
      } else {
        setAllEmployees(allEmpData || []);
      }

      // 2. Charger les externes (fusion de lecteurs_externes et mediateurs)
      const { data: externesData, error: externesError } = await supabase
        .from('tfh_externes')
        .select('id, nom, prenom, email, telephone, lecteur_externe_id, mediateur_id, mot_de_passe, tfh_accepte_numerique')
        .order('nom', { ascending: true });

      if (externesError) {
        console.error('Erreur chargement externes:', externesError);
        setExternes([]);
      } else {
        setExternes(externesData || []);
      }

      // 3. Charger les élèves avec jointure vers students
      const { data: elevesData, error: elevesError } = await supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          type,
          guide_id,
          mediateur_id,
          lecteur_interne_id,
          lecteur_externe_id,
          problematique,
          thematique,
          categorie,
          description,
          journal,
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
          tfh_non_rendu,
          url_tfh,
          created_at,
          updated_at,
          students!inner (
            nom,
            prenom,
            classe,
            mot_de_passe
          )
        `);

      if (elevesError) throw elevesError;

      // Formater les élèves
      const elevesFormatted: Eleve[] = (elevesData || []).map(eleve => {
        const studentInfo = (eleve as any).students;

        // Récupérer les infos du guide depuis employees
        const guideInfo = guidesData?.find(g => g.id === eleve.guide_id);
        const lecteurInterneInfo = guidesData?.find(g => g.id === eleve.lecteur_interne_id);

        // Récupérer les infos de l'externe (mediateur ou lecteur externe)
        const mediateurInfo = externesData?.find(e => e.mediateur_id === eleve.mediateur_id);
        const lecteurExterneInfo = externesData?.find(e => e.lecteur_externe_id === eleve.lecteur_externe_id);

        return {
          ...eleve,
          id: eleve.student_matricule,
          student_matricule: eleve.student_matricule,
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

      // 4. Charger le coordinateur connecté et ses demandes
      if (userId) {
        const { data: coordinateurData } = await supabase
          .from('employees')
          .select('id, nom, prenom')
          .eq('id', userId)
          .single();

        if (coordinateurData) {
          setCurrentCoordinateur(coordinateurData);
          // Charger les demandes une fois qu'on a l'ID coordinateur
          await loadDemandes();
        }
      }

    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, [loadDemandes]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      loadData();
    }
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

  // Fonction pour approuver une demande
  const approuverDemande = async (demandeId: string, commentaire?: string) => {
    if (!currentCoordinateur) return false;

    try {
      // Mettre à jour le statut de la demande
      const { error: updateError } = await supabase
        .from('tfh_demandes_changement_role')
        .update({
          statut: 'approuvee',
          commentaire_coordinateur: commentaire || null,
          traitee_le: new Date().toISOString(),
          traitee_par: currentCoordinateur.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', demandeId);

      if (updateError) throw updateError;

      // Récupérer les détails de la demande pour appliquer le changement
      const { data: demande, error: fetchError } = await supabase
        .from('tfh_demandes_changement_role')
        .select('*')
        .eq('id', demandeId)
        .single();

      if (fetchError) throw fetchError;

      // Appliquer le changement de rôle selon le type demandé
      if (demande.role_type === 'lecteur_interne') {
        // Mettre à jour lecteur_interne_id dans tfh_eleves
        const { error: roleError } = await supabase
          .from('tfh_eleves')
          .update({ lecteur_interne_id: demande.demandeur_id })
          .eq('student_matricule', demande.student_matricule);

        if (roleError) throw roleError;
      } else if (demande.role_type === 'lecteur_externe') {
        // Trouver l'externe avec ce lecteur_externe_id
        const { data: externe } = await supabase
          .from('tfh_externes')
          .select('id')
          .eq('lecteur_externe_id', demande.demandeur_id)
          .single();

        if (externe) {
          const { error: roleError } = await supabase
            .from('tfh_eleves')
            .update({ lecteur_externe_id: externe.id })
            .eq('student_matricule', demande.student_matricule);

          if (roleError) throw roleError;
        }
      } else if (demande.role_type === 'mediateur') {
        // Trouver l'externe avec ce mediateur_id
        const { data: externe } = await supabase
          .from('tfh_externes')
          .select('id')
          .eq('mediateur_id', demande.demandeur_id)
          .single();

        if (externe) {
          const { error: roleError } = await supabase
            .from('tfh_eleves')
            .update({ mediateur_id: externe.id })
            .eq('student_matricule', demande.student_matricule);

          if (roleError) throw roleError;
        }
      }

      await refreshData();
      return true;
    } catch (err) {
      console.error('Erreur approbation:', err);
      return false;
    }
  };

  // Fonction pour refuser une demande
  const refuserDemande = async (demandeId: string, commentaire?: string) => {
    if (!currentCoordinateur) return false;

    try {
      const { error: updateError } = await supabase
        .from('tfh_demandes_changement_role')
        .update({
          statut: 'rejetee',
          commentaire_coordinateur: commentaire || null,
          traitee_le: new Date().toISOString(),
          traitee_par: currentCoordinateur.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', demandeId);

      if (updateError) throw updateError;

      await refreshData();
      return true;
    } catch (err) {
      console.error('Erreur refus:', err);
      return false;
    }
  };

  return {
    eleves,
    guides,
    externes,
    allEmployees,
    currentCoordinateur,
    categories,
    loading,
    refreshData,
    updateEleveLocal,
    demandesEnAttente,
    demandesTraitees,
    approuverDemande,
    refuserDemande
  };
}