// hooks/useAGData.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AG_ID = '11111111-1111-1111-1111-111111111111'; // ID fixe

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

export interface Communication {
  id: string;
  groupe_id: string;
  groupe_nom: string;
  temps_demande: number;
  type_communication: string;
  resume: string;
  created_at: string;
}

export interface Pause {
  id: string;
  duree: number;
  position: number;
}

export function useAGData() {
  const [config, setConfig] = useState<AGConfig | null>(null);
  const [bureau, setBureau] = useState<Bureau[]>([]);
  const [groupes, setGroupes] = useState<GT[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Charger la configuration AG (toujours la même)
      const { data: configData, error: configError } = await supabase
        .from('ag_configs')
        .select('*')
        .eq('id', AG_ID)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      // Si pas de config, en créer une par défaut
      if (!configData) {
        const { data: newConfig, error: createError } = await supabase
          .from('ag_configs')
          .insert([{
            id: AG_ID,
            date_ag: new Date().toISOString().split('T')[0],
            heure_debut: '09:00',
            heure_fin: '12:00',
            statut: 'pas_ag',
            created_by: localStorage.getItem('userId')
          }])
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig);
      } else {
        setConfig(configData);
      }

      // 2. Charger le bureau
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
        .eq('ag_id', AG_ID);

      if (bureauError) throw bureauError;

      setBureau(bureauData?.map(b => {
        const employeeData = Array.isArray(b.employees) ? b.employees[0] : b.employees;
        return {
          id: b.id,
          employee_id: b.employee_id,
          nom: employeeData?.nom || '',
          prenom: employeeData?.prenom || '',
          role: b.role
        };
      }) || []);

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

      setEmployees(employeesData?.map(e => {
        const groupeData = Array.isArray(e.ag_groupes) ? e.ag_groupes[0] : e.ag_groupes;
        return {
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          job: e.job,
          groupe_id: e.groupe_id,
          groupe_nom: groupeData?.nom
        };
      }) || []);

      // 5. Charger les communications
      const { data: commData, error: commError } = await supabase
        .from('ag_communications')
        .select(`
          *,
          ag_groupes (
            nom
          )
        `)
        .eq('ag_id', AG_ID);

      if (commError) throw commError;

      setCommunications(commData?.map(c => {
        const groupeData = Array.isArray(c.ag_groupes) ? c.ag_groupes[0] : c.ag_groupes;
        return {
          id: c.id,
          groupe_id: c.groupe_id,
          groupe_nom: groupeData?.nom || 'Groupe inconnu',
          temps_demande: c.temps_demande,
          type_communication: c.type_communication,
          resume: c.resume,
          created_at: c.created_at
        };
      }) || []);

      // 6. Charger les pauses
      const { data: pausesData, error: pausesError } = await supabase
        .from('ag_pauses')
        .select('*')
        .eq('ag_id', AG_ID)
        .order('position');

      if (pausesError) throw pausesError;
      setPauses(pausesData || []);

    } catch (err) {
      console.error('Erreur chargement données AG:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour la config
  const updateConfig = async (newConfig: Partial<AGConfig>) => {
    try {
      // Si on repasse en préparation, on efface les anciennes communications
      if (newConfig.statut === 'preparation' && config?.statut !== 'preparation') {
        await supabase
          .from('ag_communications')
          .delete()
          .eq('ag_id', AG_ID);
      }

      const { error } = await supabase
        .from('ag_configs')
        .update({
          ...newConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', AG_ID);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error('Erreur mise à jour config:', err);
      throw err;
    }
  };

  // Ajouter un membre au bureau
  const addBureau = async (employeeId: string, role: 'maitre_du_temps' | 'animateur') => {
    try {
      const { error } = await supabase
        .from('ag_bureau')
        .insert([{
          ag_id: AG_ID,
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

  // Sauvegarder une communication (écrase l'ancienne)
  const saveCommunication = async (groupeId: string, data: {
    temps_demande: number;
    type_communication: string;
    resume: string;
  }) => {
    try {
      const { error } = await supabase
        .from('ag_communications')
        .upsert({
          ag_id: AG_ID,
          groupe_id: groupeId,
          ...data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'ag_id,groupe_id'
        });

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error('Erreur sauvegarde communication:', err);
      throw err;
    }
  };

  // Réinitialiser toutes les communications
  const resetCommunications = async () => {
    try {
      const { error } = await supabase
        .from('ag_communications')
        .delete()
        .eq('ag_id', AG_ID);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error('Erreur reset communications:', err);
      throw err;
    }
  };

  // Ajouter une pause
  const addPause = async (duree: number, position: number) => {
    try {
      const { error } = await supabase
        .from('ag_pauses')
        .insert([{
          ag_id: AG_ID,
          duree,
          position
        }]);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur ajout pause:', err);
      throw err;
    }
  };

  // Mettre à jour une pause
  const updatePause = async (pauseId: string, duree: number, position: number) => {
    try {
      const { error } = await supabase
        .from('ag_pauses')
        .update({ duree, position })
        .eq('id', pauseId);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur mise à jour pause:', err);
      throw err;
    }
  };

  // Supprimer une pause
  const removePause = async (pauseId: string) => {
    try {
      const { error } = await supabase
        .from('ag_pauses')
        .delete()
        .eq('id', pauseId);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur suppression pause:', err);
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
    communications,
    pauses,
    loading,
    error,
    updateConfig,
    addBureau,
    removeBureau,
    assignGroupe,
    saveCommunication,
    resetCommunications,
    addPause,
    updatePause,
    removePause,
    refresh: loadData
  };
}
