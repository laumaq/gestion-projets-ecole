// hooks/useAGData.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface AGConfig {
  id: string;
  date_ag: string;
  heure_debut: string;
  heure_fin: string;
  statut: 'pas_ag' | 'preparation' | 'planning_etabli';
}

export interface Bureau {
  id: string;
  employee_id: string;
  nom: string;
  prenom: string;
  role: 'maitre_du_temps' | 'animateur';
}

export interface GT {
  id: string;
  nom: string;
}

export interface Employee {
  id: string;
  nom: string;
  prenom: string;
  job: string;
  groupe_id: string | null;
  groupe_nom?: string;
}

export function useAGData() {
  const [config, setConfig] = useState<AGConfig | null>(null);
  const [bureau, setBureau] = useState<Bureau[]>([]);
  const [groupes, setGroupes] = useState<GT[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Charger la configuration AG (la plus récente)
      const { data: configData, error: configError } = await supabase
        .from('ag_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      setConfig(configData);

      // 2. Si une config existe, charger le bureau
      if (configData) {
        const { data: bureauData, error: bureauError } = await supabase
          .from('ag_bureau')
          .select(`
            id,
            role,
            employee_id,
            employees:employee_id (
              nom,
              prenom
            )
          `)
          .eq('ag_id', configData.id);

        if (bureauError) throw bureauError;

        setBureau(bureauData?.map(b => ({
          id: b.id,
          employee_id: b.employee_id,
          nom: b.employees?.nom || '',
          prenom: b.employees?.prenom || '',
          role: b.role
        })) || []);
      }

      // 3. Charger tous les groupes
      const { data: groupesData, error: groupesError } = await supabase
        .from('ag_groupes')
        .select('*')
        .order('nom');

      if (groupesError) throw groupesError;
      setGroupes(groupesData || []);

      // 4. Charger tous les employés avec leur groupe
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          nom,
          prenom,
          job,
          groupe_id,
          ag_groupes:groupe_id (
            nom
          )
        `)
        .order('nom');

      if (employeesError) throw employeesError;

      setEmployees(employeesData?.map(e => ({
        id: e.id,
        nom: e.nom,
        prenom: e.prenom,
        job: e.job,
        groupe_id: e.groupe_id,
        groupe_nom: e.ag_groupes?.nom
      })) || []);

    } catch (err) {
      console.error('Erreur chargement données AG:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Créer ou mettre à jour la config
  const saveConfig = async (newConfig: Partial<AGConfig>) => {
    try {
      if (config?.id) {
        // Mise à jour
        const { error } = await supabase
          .from('ag_configs')
          .update({
            ...newConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('ag_configs')
          .insert([{
            ...newConfig,
            created_by: localStorage.getItem('userId'),
            statut: 'preparation'
          }]);

        if (error) throw error;
      }

      await loadData();
    } catch (err) {
      console.error('Erreur sauvegarde config:', err);
      throw err; // On throw l'erreur pour la gérer dans le composant
    }
  };

  // Ajouter un membre au bureau
  const addBureau = async (employeeId: string, role: 'maitre_du_temps' | 'animateur') => {
    if (!config) throw new Error('Aucune configuration AG');

    try {
      const { error } = await supabase
        .from('ag_bureau')
        .insert([{
          ag_id: config.id,
          employee_id: employeeId,
          role
        }]);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error('Erreur ajout bureau:', err);
      throw err;
    }
  };

  // Retirer un membre du bureau
  const removeBureau = async (bureauId: string) => {
    try {
      const { error } = await supabase
        .from('ag_bureau')
        .delete()
        .eq('id', bureauId);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error('Erreur suppression bureau:', err);
      throw err;
    }
  };

  // Assigner un groupe à un employé
  const assignGroupe = async (employeeId: string, groupeId: string | null) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ groupe_id: groupeId })
        .eq('id', employeeId);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error('Erreur assignation groupe:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    config,
    bureau,
    groupes,
    employees,
    loading,
    error,
    saveConfig,
    addBureau,
    removeBureau,
    assignGroupe,
    refresh: loadData
  };
}
