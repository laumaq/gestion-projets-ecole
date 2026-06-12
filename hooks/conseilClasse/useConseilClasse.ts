// hooks/conseilClasse/useConseilClasse.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ConseilClasseConfig {
  id: string;
  annee_scolaire: string;
  classe_nom: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConseilClasseRoles {
  id: string;
  annee_scolaire: string;
  classe_nom: string;
  titulaire_id: string | null;
  co_titulaire_id: string | null;
  president_matricule: number | null;
  secretaire_matricule: number | null;
  delegue_voyage_matricule: number | null;
  updated_at: string;
  // Relations
  titulaire?: {
    id: string;
    nom: string;
    prenom: string;
    job: string;
  };
  co_titulaire?: {
    id: string;
    nom: string;
    prenom: string;
    job: string;
  };
  president?: {
    matricule: number;
    nom: string;
    prenom: string;
    classe: string;
  };
  secretaire?: {
    matricule: number;
    nom: string;
    prenom: string;
    classe: string;
  };
  delegue_voyage?: {
    matricule: number;
    nom: string;
    prenom: string;
    classe: string;
  };
}

export interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  niveau: string;
  sexe: string;
}

export function useConseilClasse(classeNom: string, anneeScolaire: string = '2024-2025') {
  const [config, setConfig] = useState<ConseilClasseConfig | null>(null);
  const [roles, setRoles] = useState<ConseilClasseRoles | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'titulaire' | 'co_titulaire' | 'eleve' | 'direction' | 'none'>('none');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Charger ou créer la config
      let { data: configData, error: configError } = await supabase
        .from('conseil_classes_config')
        .select('*')
        .eq('annee_scolaire', anneeScolaire)
        .eq('classe_nom', classeNom)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (!configData) {
        const { data: newConfig, error: createError } = await supabase
          .from('conseil_classes_config')
          .insert([{
            annee_scolaire: anneeScolaire,
            classe_nom: classeNom,
            actif: true
          }])
          .select()
          .single();

        if (createError) throw createError;
        configData = newConfig;
      }
      setConfig(configData);

      // 2. Charger les rôles
      let { data: rolesData, error: rolesError } = await supabase
        .from('conseil_classes_roles')
        .select(`
          id,
          annee_scolaire,
          classe_nom,
          titulaire_id,
          co_titulaire_id,
          president_matricule,
          secretaire_matricule,
          delegue_voyage_matricule,
          updated_at,
          titulaire:titulaire_id (id, nom, prenom, job),
          co_titulaire:co_titulaire_id (id, nom, prenom, job),
          president:president_matricule (matricule, nom, prenom, classe),
          secretaire:secretaire_matricule (matricule, nom, prenom, classe),
          delegue_voyage:delegue_voyage_matricule (matricule, nom, prenom, classe)
        `)
        .eq('annee_scolaire', anneeScolaire)
        .eq('classe_nom', classeNom)
        .maybeSingle();

      if (rolesError && rolesError.code !== 'PGRST116') {
        throw rolesError;
      }

      if (!rolesData) {
        const { data: newRoles, error: createRolesError } = await supabase
          .from('conseil_classes_roles')
          .insert([{
            annee_scolaire: anneeScolaire,
            classe_nom: classeNom
          }])
          .select(`
            id,
            annee_scolaire,
            classe_nom,
            titulaire_id,
            co_titulaire_id,
            president_matricule,
            secretaire_matricule,
            delegue_voyage_matricule,
            updated_at,
            titulaire:titulaire_id (id, nom, prenom, job),
            co_titulaire:co_titulaire_id (id, nom, prenom, job),
            president:president_matricule (matricule, nom, prenom, classe),
            secretaire:secretaire_matricule (matricule, nom, prenom, classe),
            delegue_voyage:delegue_voyage_matricule (matricule, nom, prenom, classe)
          `)
          .single();

        if (createRolesError) throw createRolesError;
        rolesData = newRoles;
      }

      if (rolesData) {
        // Extraire les données des relations
        const titulaire = Array.isArray(rolesData.titulaire) && rolesData.titulaire.length > 0 
          ? {
              id: rolesData.titulaire[0].id,
              nom: rolesData.titulaire[0].nom,
              prenom: rolesData.titulaire[0].prenom,
              job: rolesData.titulaire[0].job
            }
          : undefined;
          
        const coTitulaire = Array.isArray(rolesData.co_titulaire) && rolesData.co_titulaire.length > 0
          ? {
              id: rolesData.co_titulaire[0].id,
              nom: rolesData.co_titulaire[0].nom,
              prenom: rolesData.co_titulaire[0].prenom,
              job: rolesData.co_titulaire[0].job
            }
          : undefined;
          
        const president = Array.isArray(rolesData.president) && rolesData.president.length > 0
          ? {
              matricule: rolesData.president[0].matricule,
              nom: rolesData.president[0].nom,
              prenom: rolesData.president[0].prenom,
              classe: rolesData.president[0].classe
            }
          : undefined;
          
        const secretaire = Array.isArray(rolesData.secretaire) && rolesData.secretaire.length > 0
          ? {
              matricule: rolesData.secretaire[0].matricule,
              nom: rolesData.secretaire[0].nom,
              prenom: rolesData.secretaire[0].prenom,
              classe: rolesData.secretaire[0].classe
            }
          : undefined;
          
        const delegueVoyage = Array.isArray(rolesData.delegue_voyage) && rolesData.delegue_voyage.length > 0
          ? {
              matricule: rolesData.delegue_voyage[0].matricule,
              nom: rolesData.delegue_voyage[0].nom,
              prenom: rolesData.delegue_voyage[0].prenom,
              classe: rolesData.delegue_voyage[0].classe
            }
          : undefined;

        setRoles({
          id: rolesData.id,
          annee_scolaire: rolesData.annee_scolaire,
          classe_nom: rolesData.classe_nom,
          titulaire_id: rolesData.titulaire_id,
          co_titulaire_id: rolesData.co_titulaire_id,
          president_matricule: rolesData.president_matricule,
          secretaire_matricule: rolesData.secretaire_matricule,
          delegue_voyage_matricule: rolesData.delegue_voyage_matricule,
          updated_at: rolesData.updated_at,
          titulaire: titulaire,
          co_titulaire: coTitulaire,
          president: president,
          secretaire: secretaire,
          delegue_voyage: delegueVoyage
        });
      }

      // 3. Charger les élèves de la classe
      const { data: elevesData, error: elevesError } = await supabase
        .from('students')
        .select('matricule, nom, prenom, classe, niveau, sexe')
        .eq('classe', classeNom)
        .order('nom');

      if (elevesError) throw elevesError;
      setEleves(elevesData || []);

      // 4. Déterminer le rôle de l'utilisateur
      const userId = localStorage.getItem('userId');
      const userJob = localStorage.getItem('userJob');
      const userType = localStorage.getItem('userType');

      if (userType === 'employee') {
        if (userJob === 'direction') {
          setUserRole('direction');
        } else if (rolesData?.titulaire_id === userId) {
          setUserRole('titulaire');
        } else if (rolesData?.co_titulaire_id === userId) {
          setUserRole('co_titulaire');
        } else {
          setUserRole('none');
        }
      } else if (userType === 'student') {
        const userIdNum = parseInt(userId || '0');
        if (rolesData?.president_matricule === userIdNum ||
            rolesData?.secretaire_matricule === userIdNum ||
            rolesData?.delegue_voyage_matricule === userIdNum) {
          setUserRole('eleve');
        } else {
          setUserRole('none');
        }
      }

    } catch (err) {
      console.error('Erreur chargement conseil classe:', err);
      setError(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour les rôles (pour direction)
  const updateRoles = async (updates: {
    titulaire_id?: string | null;
    co_titulaire_id?: string | null;
    president_matricule?: number | null;
    secretaire_matricule?: number | null;
    delegue_voyage_matricule?: number | null;
  }) => {
    try {
      const { error } = await supabase
        .from('conseil_classes_roles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: localStorage.getItem('userId')
        })
        .eq('annee_scolaire', anneeScolaire)
        .eq('classe_nom', classeNom);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur mise à jour rôles:', err);
      throw err;
    }
  };

  // Activer/désactiver le conseil
  const toggleActif = async (actif: boolean) => {
    try {
      const { error } = await supabase
        .from('conseil_classes_config')
        .update({ actif, updated_at: new Date().toISOString() })
        .eq('annee_scolaire', anneeScolaire)
        .eq('classe_nom', classeNom);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      throw err;
    }
  };

  // Vérifier si l'utilisateur peut créer un vote
  const peutCreerVote = (): boolean => {
    if (userRole === 'direction') return true;
    if (userRole === 'titulaire' || userRole === 'co_titulaire') return true;
    if (userRole === 'eleve' && (roles?.president_matricule || roles?.secretaire_matricule)) return true;
    return false;
  };

  // Vérifier si l'utilisateur peut gérer les rôles
  const peutGererRoles = (): boolean => {
    return userRole === 'direction';
  };

  useEffect(() => {
    if (classeNom) {
      loadData();
    }
  }, [classeNom, anneeScolaire]);

  return {
    config,
    roles,
    eleves,
    loading,
    error,
    userRole,
    updateRoles,
    toggleActif,
    refresh: loadData,
    peutCreerVote,
    peutGererRoles
  };
}