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
  ordre?: number;
  type_intervention: 'gt'; // Pour distinguer
}

export interface InterventionLibre {
  id: string;
  employee_id: string;
  employee_nom: string;
  employee_prenom: string;
  titre: string;
  temps_demande: number;
  type_communication: string;
  resume: string;
  created_at: string;
  ordre?: number;
  type_intervention: 'libre'; // Pour distinguer
}

export type Intervention = Communication | InterventionLibre;

export interface Pause {
  id: string;
  duree: number;
  heure_debut: string;
  position: number;
}

export function useAGData() {
  const [config, setConfig] = useState<AGConfig | null>(null);
  const [bureau, setBureau] = useState<Bureau[]>([]);
  const [groupes, setGroupes] = useState<GT[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [interventionsLibres, setInterventionsLibres] = useState<InterventionLibre[]>([]);
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Liste fusionnée de toutes les interventions pour le planning
  const [toutesInterventions, setToutesInterventions] = useState<Intervention[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Charger la configuration AG
      const { data: configData, error: configError } = await supabase
        .from('ag_configs')
        .select('*')
        .eq('id', AG_ID)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

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

      // 5. Charger les communications (GT)
      const { data: commData, error: commError } = await supabase
        .from('ag_communications')
        .select(`
          *,
          ag_groupes (
            nom
          )
        `)
        .eq('ag_id', AG_ID)
        .order('ordre', { ascending: true, nullsFirst: false });

      if (commError) throw commError;

      const comms: Communication[] = commData?.map(c => {
        const groupeData = Array.isArray(c.ag_groupes) ? c.ag_groupes[0] : c.ag_groupes;
        return {
          id: c.id,
          groupe_id: c.groupe_id,
          groupe_nom: groupeData?.nom || 'Groupe inconnu',
          temps_demande: c.temps_demande,
          type_communication: c.type_communication,
          resume: c.resume,
          created_at: c.created_at,
          ordre: c.ordre,
          type_intervention: 'gt'
        };
      }) || [];
      setCommunications(comms);

      // 6. Charger les interventions libres
      const { data: libresData, error: libresError } = await supabase
        .from('ag_interventions_libres')
        .select(`
          *,
          employees:employee_id (
            nom,
            prenom
          )
        `)
        .eq('ag_id', AG_ID)
        .order('ordre', { ascending: true, nullsFirst: false });
      
      if (libresError) throw libresError;
      
      const libres: InterventionLibre[] = libresData?.map(l => {
        const employeeData = Array.isArray(l.employees) ? l.employees[0] : l.employees;
        return {
          id: l.id,
          employee_id: l.employee_id,
          employee_nom: employeeData?.nom || '',
          employee_prenom: employeeData?.prenom || '',
          titre: l.titre,
          temps_demande: l.temps_demande,
          type_communication: l.type_communication,
          resume: l.resume,
          created_at: l.created_at,
          ordre: l.ordre,
          type_intervention: 'libre'
        };
      }) || [];
      setInterventionsLibres(libres);

      // 7. Charger les pauses
      const { data: pausesData, error: pausesError } = await supabase
        .from('ag_pauses')
        .select('*')
        .eq('ag_id', AG_ID)
        .order('heure_debut');

      if (pausesError) throw pausesError;
      setPauses(pausesData || []);

      // 8. Fusionner et trier toutes les interventions
      const toutes = [...comms, ...libres].sort((a, b) => {
        // Si les deux ont un ordre, trier par ordre
        if (a.ordre != null && b.ordre != null) {
          return a.ordre - b.ordre;
        }
        // Si un seul a un ordre, celui avec ordre passe avant
        if (a.ordre != null) return -1;
        if (b.ordre != null) return 1;
        // Sinon, trier par date de création
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setToutesInterventions(toutes);

    } catch (err) {
      console.error('ERREUR DÉTAILLÉE chargement données AG:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        console.error('Message:', err.message);
      }
      if (err && typeof err === 'object' && 'code' in err) {
        console.error('Code:', err.code);
      }
      setError(`Erreur lors du chargement des données: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour la config
  const updateConfig = async (newConfig: Partial<AGConfig>) => {
    try {
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

  // Sauvegarder une communication (GT)
  const saveCommunication = async (groupeId: string, data: {
    temps_demande: number;
    type_communication: string;
    resume: string;
  }) => {
    try {
      // Récupérer l'ordre maximum pour placer la nouvelle à la fin
      const maxOrdre = Math.max(
        ...communications.map(c => c.ordre || 0),
        ...interventionsLibres.map(i => i.ordre || 0),
        0
      );

      const { error } = await supabase
        .from('ag_communications')
        .upsert({
          ag_id: AG_ID,
          groupe_id: groupeId,
          ...data,
          ordre: maxOrdre + 1,
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

  // Réinitialiser toutes les communications (GT)
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

  // Sauvegarder une intervention libre
  const saveInterventionLibre = async (data: {
    titre: string;
    temps_demande: number;
    type_communication: string;
    resume: string;
  }) => {
    const employeeId = localStorage.getItem('userId');
    if (!employeeId) throw new Error('Utilisateur non connecté');

    try {
      // Récupérer l'ordre maximum pour placer la nouvelle à la fin
      const maxOrdre = Math.max(
        ...communications.map(c => c.ordre || 0),
        ...interventionsLibres.map(i => i.ordre || 0),
        0
      );

      const { error } = await supabase
        .from('ag_interventions_libres')
        .upsert({
          ag_id: AG_ID,
          employee_id: employeeId,
          ...data,
          ordre: maxOrdre + 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'ag_id,employee_id'
        });

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur sauvegarde intervention libre:', err);
      throw err;
    }
  };

  // Supprimer une intervention libre
  const deleteInterventionLibre = async (interventionId: string) => {
    try {
      const { error } = await supabase
        .from('ag_interventions_libres')
        .delete()
        .eq('id', interventionId);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur suppression intervention libre:', err);
      throw err;
    }
  };

  // Ajouter une pause
  const addPause = async (duree: number, heure_debut: string) => {
    try {
      const { error } = await supabase
        .from('ag_pauses')
        .insert([{
          ag_id: AG_ID,
          duree,
          heure_debut,
          position: 0
        }]);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Erreur ajout pause:', err);
      throw err;
    }
  };

  // Mettre à jour une pause
  const updatePause = async (pauseId: string, duree: number, heure_debut: string) => {
    try {
      const { error } = await supabase
        .from('ag_pauses')
        .update({ 
          duree, 
          heure_debut,
          updated_at: new Date().toISOString()
        })
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

  // Mettre à jour l'ordre global des interventions (GT et libres)
  const updateOrdre = async (ordreData: { id: string; position: number; type: 'gt' | 'libre' }[]) => {
    try {
      for (const item of ordreData) {
        if (item.type === 'gt') {
          await supabase
            .from('ag_communications')
            .update({ ordre: item.position })
            .eq('id', item.id);
        } else {
          await supabase
            .from('ag_interventions_libres')
            .update({ ordre: item.position })
            .eq('id', item.id);
        }
      }
      await loadData();
    } catch (err) {
      console.error('Erreur mise à jour ordre:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    // Données brutes
    config,
    bureau,
    groupes,
    employees,
    communications,
    interventionsLibres,
    pauses,
    toutesInterventions, // La liste fusionnée pour le planning
    loading,
    error,
    
    // Actions
    updateConfig,
    addBureau,
    removeBureau,
    assignGroupe,
    saveCommunication,
    resetCommunications,
    saveInterventionLibre,
    deleteInterventionLibre,
    addPause,
    updatePause,
    removePause,
    updateOrdre,
    refresh: loadData
  };
}
