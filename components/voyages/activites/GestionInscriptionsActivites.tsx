'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  voyageId: string;
  isResponsable: boolean;
}

interface ActivitePermission {
  id: string;
  titre: string;
  heure_debut: string;
  heure_fin: string;
  checked: boolean;
}

interface GroupePermission {
  id: string;
  nom: string;
  checked: boolean;
  activites: ActivitePermission[];
}

interface JourPermission {
  id: string;
  date: string;
  checked: boolean;
  groupes: GroupePermission[];
}

interface Participant {
  id: string;
  nom: string;
  prenom: string;
  type: 'student' | 'employee';
  classe?: string;
  eleve_id?: number;
}

export default function GestionInscriptionsActivites({ voyageId, isResponsable }: Props) {
  const [jours, setJours] = useState<any[]>([]);
  const [selectedActivite, setSelectedActivite] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJours, setExpandedJours] = useState<Set<string>>(new Set());
  const [expandedGroupes, setExpandedGroupes] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tousParticipants, setTousParticipants] = useState<Participant[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchParticipantTerm, setSearchParticipantTerm] = useState('');
  const [participantsInvalides, setParticipantsInvalides] = useState<{ participant: Participant; raison: string }[]>([]);
  const [showClasseModal, setShowClasseModal] = useState(false);
  const [classesDisponibles, setClassesDisponibles] = useState<string[]>([]);
  const [classesSelectionnees, setClassesSelectionnees] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsVoyage, setPermissionsVoyage] = useState(false);
  const [expandedPermissionsJours, setExpandedPermissionsJours] = useState<Set<string>>(new Set());
  const [expandedPermissionsGroupes, setExpandedPermissionsGroupes] = useState<Set<string>>(new Set());
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsJours, setPermissionsJours] = useState<JourPermission[]>([]);

  useEffect(() => {
    loadJours();
  }, [voyageId]);

  useEffect(() => {
    if (selectedActivite) {
      const activiteId = selectedActivite.id;
      loadParticipants(activiteId);
      loadTousParticipants(activiteId);
    }
  }, [selectedActivite]);

  // Et ajoute ce useEffect pour charger les classes quand tousParticipants change
  useEffect(() => {
    if (tousParticipants.length > 0) {
      chargerClassesDisponibles();
    }
  }, [tousParticipants]);

  useEffect(() => {
    if (showPermissionsModal) {
      chargerPermissions();
    }
  }, [showPermissionsModal]);

  const loadJours = async () => {
    const { data: joursData } = await supabase
      .from('planning_jours')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date');
    
    if (!joursData) return;

    // Récupérer tous les groupes en une seule requête
    const { data: tousGroupes } = await supabase
      .from('groupes_activites')
      .select('*')
      .in('planning_jour_id', joursData.map(j => j.id))
      .order('ordre');

    // Récupérer toutes les activités en une seule requête
    const { data: toutesActivites } = await supabase
      .from('activites')
      .select('*')
      .in('groupe_id', tousGroupes?.map(g => g.id) || [])
      .order('heure_debut');

    // Regrouper en mémoire
    const groupesParJour = new Map();
    tousGroupes?.forEach((groupe: any) => {  // ← AJOUTE "any"
      if (!groupesParJour.has(groupe.planning_jour_id)) {
        groupesParJour.set(groupe.planning_jour_id, []);
      }
      groupesParJour.get(groupe.planning_jour_id).push(groupe);
    });

    const activitesParGroupe = new Map();
    toutesActivites?.forEach((activite: any) => {  // ← AJOUTE "any"
      if (!activitesParGroupe.has(activite.groupe_id)) {
        activitesParGroupe.set(activite.groupe_id, []);
      }
      activitesParGroupe.get(activite.groupe_id).push(activite);
    });

    const joursAvecGroupes = joursData.map(jour => {
      const groupes = groupesParJour.get(jour.id) || [];
      const groupesAvecActivites = groupes.map((groupe: any) => ({  // ← AJOUTE "any"
        ...groupe,
        activites: activitesParGroupe.get(groupe.id) || []
      }));
      
      const groupesTries = [...groupesAvecActivites].sort((a: any, b: any) => {  // ← AJOUTE "any"
        const heureA = a.activites[0]?.heure_debut || '23:59:59';
        const heureB = b.activites[0]?.heure_debut || '23:59:59';
        return heureA.localeCompare(heureB);
      });

      return { ...jour, groupes: groupesTries };
    });

    setJours(joursAvecGroupes);
    setLoading(false);
  };

  const performSearch = async (term: string) => {
    if (term.length < 3) return;
    
    const { data } = await supabase
      .from('activites')
      .select(`
        *,
        groupes_activites!inner (
          id,
          nom,
          planning_jours!inner (
            id,
            date
          )
        )
      `)
      .ilike('titre', `%${term}%`)
      .eq('groupes_activites.planning_jours.voyage_id', voyageId);
    
    // Transformer les données pour avoir date et groupe_nom directement
    const formatted = (data || []).map((act: any) => ({
      ...act,
      groupe_nom: act.groupes_activites.nom,
      date: act.groupes_activites.planning_jours.date
    }));
    
    setSearchResults(formatted);
  };

  const loadParticipants = useCallback(async (activiteId: string) => {
    if (!activiteId) return;
    
    // Requêtes parallèles pour élèves et employés
    const [elevesData, employesData] = await Promise.all([
      supabase
        .from('inscriptions_activites')
        .select('participant_id')
        .eq('activite_id', activiteId)
        .eq('participant_type', 'student'),
      supabase
        .from('inscriptions_activites')
        .select('participant_id')
        .eq('activite_id', activiteId)
        .eq('participant_type', 'employee')
    ]);

    // Traitement des élèves
    const elevesIds = elevesData.data?.map(e => e.participant_id) || [];
    let eleves: Participant[] = [];

    if (elevesIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('students')
        .select('matricule, nom, prenom, classe')
        .in('matricule', elevesIds.map(id => parseInt(id)));

      eleves = (studentsData || []).map(s => ({
        id: s.matricule.toString(),
        nom: s.nom,
        prenom: s.prenom,
        type: 'student',
        classe: s.classe,
        eleve_id: s.matricule
      }));
    }

    // Traitement des employés
    const employesIds = employesData.data?.map(e => e.participant_id) || [];
    let employes: Participant[] = [];

    if (employesIds.length > 0) {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, nom, prenom')
        .in('id', employesIds);

      employes = (employeesData || []).map(e => ({
        id: e.id,
        nom: e.nom,
        prenom: e.prenom,
        type: 'employee'
      }));
    }

    // Fusion et tri
    const participantsList = [...eleves, ...employes];
    
    participantsList.sort((a, b) => {
      if (a.type === 'employee' && b.type !== 'employee') return -1;
      if (a.type !== 'employee' && b.type === 'employee') return 1;
      if (a.type === 'employee' && b.type === 'employee') {
        return a.nom.localeCompare(b.nom);
      }
      const classeA = a.classe || '';
      const classeB = b.classe || '';
      if (classeA !== classeB) return classeA.localeCompare(classeB);
      return a.nom.localeCompare(b.nom);
    });

    setParticipants(participantsList);
  }, []); // Pas de dépendances car toutes les valeurs sont passées en paramètres
    
  const loadTousParticipants = useCallback(async (activiteId: string) => {
    if (!activiteId) return;
    
    console.log('🔍 loadTousParticipants - début pour activité:', activiteId);
    
    // 1. Récupérer les IDs des participants déjà inscrits à CETTE activité
    const { data: inscritsData } = await supabase
      .from('inscriptions_activites')
      .select('participant_id, participant_type')
      .eq('activite_id', activiteId);

    const inscritsIds = new Set(inscritsData?.map(i => `${i.participant_id}_${i.participant_type}`) || []);

    // 2. Récupérer tous les élèves du voyage
    const { data: elevesData } = await supabase
      .from('voyage_participants')
      .select('eleve_id, students!inner(matricule, nom, prenom, classe)')
      .eq('voyage_id', voyageId)
      .eq('statut', 'confirme');

    const eleves: Participant[] = (elevesData || []).map((p: any) => ({
      id: p.eleve_id.toString(),
      nom: p.students.nom,
      prenom: p.students.prenom,
      type: 'student',
      classe: p.students.classe,
      eleve_id: p.eleve_id
    }));

    // 3. Récupérer tous les employés du voyage
    const { data: employesData } = await supabase
      .from('voyage_professeurs')
      .select('professeur_id, employees!inner(id, nom, prenom)')
      .eq('voyage_id', voyageId);

    const employes: Participant[] = (employesData || []).map((p: any) => ({
      id: p.professeur_id,
      nom: p.employees.nom,
      prenom: p.employees.prenom,
      type: 'employee'
    }));

    // 4. Récupérer toutes les inscriptions pour chaque participant
    const tousParticipantsPotentiels = [...eleves, ...employes];
    const allParticipantsIds = tousParticipantsPotentiels.map(p => p.id);
    
    const { data: toutesInscriptions } = await supabase
      .from('inscriptions_activites')
      .select('participant_id, participant_type, activite_id')
      .in('participant_id', allParticipantsIds);

    // 5. Récupérer les activités du groupe
    const { data: activitesDuGroupe } = await supabase
      .from('activites')
      .select('id')
      .eq('groupe_id', selectedActivite.groupe_id);
    const activitesGroupeIds = new Set(activitesDuGroupe?.map(a => a.id) || []);

    // 6. Récupérer le nb max du groupe
    const { data: groupeData } = await supabase
      .from('groupes_activites')
      .select('nb_inscriptions_max')
      .eq('id', selectedActivite.groupe_id)
      .single();

    // 7. Récupérer les horaires de l'activité candidate
    const debutNouveau = selectedActivite.heure_debut;
    const finNouveau = selectedActivite.heure_fin;

    // 8. Récupérer tous les détails des activités pour vérifier les conflits
    const { data: toutesActivitesDetails } = await supabase
      .from('activites')
      .select('id, heure_debut, heure_fin');

    const activitesDetailsMap = new Map();
    toutesActivitesDetails?.forEach(a => {
      activitesDetailsMap.set(a.id, { debut: a.heure_debut, fin: a.heure_fin });
    });

    // 9. Filtrer les participants valides
    const participantsValides = tousParticipantsPotentiels.filter(p => {
      // Déjà inscrit à cette activité ?
      if (inscritsIds.has(`${p.id}_${p.type}`)) return false;
      
      // Récupérer les inscriptions du participant
      const inscriptionsParticipant = toutesInscriptions?.filter(i => 
        i.participant_id === p.id && i.participant_type === p.type
      ) || [];
      
      // Vérifier le nombre d'inscriptions dans le groupe
      const inscritesDansGroupe = inscriptionsParticipant.filter(i => 
        activitesGroupeIds.has(i.activite_id)
      ).length;
      
      if (groupeData && inscritesDansGroupe >= groupeData.nb_inscriptions_max) {
        return false;
      }
      
      // Vérifier les conflits horaires
      const activitesInscrites = inscriptionsParticipant.map(i => i.activite_id);
      const aConflit = activitesInscrites.some(actId => {
        const actDetails = activitesDetailsMap.get(actId);
        if (!actDetails) return false;
        const debutExistant = actDetails.debut;
        const finExistant = actDetails.fin;
        return (debutNouveau < finExistant && debutExistant < finNouveau);
      });
      
      if (aConflit) return false;
      
      return true;
    });

    // Trier les participants valides
    participantsValides.sort((a, b) => {
      if (a.type === 'employee' && b.type !== 'employee') return -1;
      if (a.type !== 'employee' && b.type === 'employee') return 1;
      if (a.type === 'employee' && b.type === 'employee') {
        return a.nom.localeCompare(b.nom);
      }
      const classeA = a.classe || '';
      const classeB = b.classe || '';
      if (classeA !== classeB) return classeA.localeCompare(classeB);
      return a.nom.localeCompare(b.nom);
    });

    setTousParticipants(participantsValides);
  }, [voyageId, selectedActivite]);

    
  const retirerParticipant = async (participantId: string, participantType: string) => {
    if (!confirm('Retirer ce participant de l\'activité ?')) return;
    
    setActionLoading(true);
    setSaving(true);

    const { error } = await supabase
      .from('inscriptions_activites')
      .delete()
      .eq('activite_id', selectedActivite.id)
      .eq('participant_id', participantId)
      .eq('participant_type', participantType);

    if (!error) {
      await loadParticipants(selectedActivite.id);
      await loadTousParticipants(selectedActivite.id);
    }
    setSaving(false);
    setActionLoading(false);
  };

  const ajouterParticipant = async (participantId: string, participantType: string) => {
    // Vérifier la jauge
    if (selectedActivite.jauge) {
      const nbActuels = participants.length; // participants déjà inscrits
      if (nbActuels >= selectedActivite.jauge) {
        alert(`Jauge atteinte (${selectedActivite.jauge}/${selectedActivite.jauge})`);
        return;
      }
    }
    
    setActionLoading(true);
    setSaving(true);

    const { error } = await supabase
      .from('inscriptions_activites')
      .insert({
        activite_id: selectedActivite.id,
        participant_id: participantId,
        participant_type: participantType
      });

    if (!error) {
      await loadParticipants(selectedActivite.id);
      await loadTousParticipants(selectedActivite.id);
    } else if (error.code === '23505') {
      alert('Ce participant est déjà inscrit');
    } else {
      alert('Erreur lors de l\'inscription');
    }
    setSaving(false);
    setActionLoading(false);
  };

  const toggleJour = (jourId: string) => {
    const newExpanded = new Set(expandedJours);
    if (newExpanded.has(jourId)) newExpanded.delete(jourId);
    else newExpanded.add(jourId);
    setExpandedJours(newExpanded);
  };

  const toggleGroupe = (groupeId: string) => {
    const newExpanded = new Set(expandedGroupes);
    if (newExpanded.has(groupeId)) newExpanded.delete(groupeId);
    else newExpanded.add(groupeId);
    setExpandedGroupes(newExpanded);
  };

  // Vérifier si un participant peut s'inscrire à l'activité
  const peutSInscrire = async (participantId: string, participantType: string): Promise<{ peut: boolean; raison: string }> => {
    // 1. Vérifier si déjà inscrit (déjà fait dans l'appel)
    
    // 2. Récupérer les inscriptions du participant
    const { data: inscriptionsParticipant } = await supabase
      .from('inscriptions_activites')
      .select('activite_id')
      .eq('participant_id', participantId)
      .eq('participant_type', participantType);
    
    const activitesInscritesIds = new Set(inscriptionsParticipant?.map(i => i.activite_id) || []);
    
    // 3. Vérifier le nombre d'inscriptions dans le groupe
    const { data: activitesDuGroupe } = await supabase
      .from('activites')
      .select('id')
      .eq('groupe_id', selectedActivite.groupe_id);
    
    const inscritesDansGroupe = activitesDuGroupe?.filter(a => activitesInscritesIds.has(a.id)).length || 0;
    
    // Récupérer le nb max du groupe
    const { data: groupeData } = await supabase
      .from('groupes_activites')
      .select('nb_inscriptions_max')
      .eq('id', selectedActivite.groupe_id)
      .single();
    
    if (groupeData && inscritesDansGroupe >= groupeData.nb_inscriptions_max) {
      return { peut: false, raison: `Maximum ${groupeData.nb_inscriptions_max} activité(s) dans ce groupe` };
    }
    
    // 4. Vérifier les conflits horaires
    // Récupérer toutes les activités du participant
    const activitesParticipant = await Promise.all(
      Array.from(activitesInscritesIds).map(async (actId) => {
        const { data } = await supabase
          .from('activites')
          .select('heure_debut, heure_fin')
          .eq('id', actId)
          .single();
        return data;
      })
    );
    
    const conflit = activitesParticipant.some(act => {
      if (!act) return false;
      const debutExistant = act.heure_debut;
      const finExistant = act.heure_fin;
      const debutNouveau = selectedActivite.heure_debut;
      const finNouveau = selectedActivite.heure_fin;
      return (debutNouveau < finExistant && debutExistant < finNouveau);
    });
    
    if (conflit) {
      return { peut: false, raison: 'Conflit d\'horaire avec une autre activité' };
    }
    
    return { peut: true, raison: '' };
  };

  const participantsFiltres = useMemo(() => {
    if (!searchParticipantTerm) return participants;
    return participants.filter(p =>
      `${p.prenom} ${p.nom}`.toLowerCase().includes(searchParticipantTerm.toLowerCase()) ||
      (p.classe && p.classe.toLowerCase().includes(searchParticipantTerm.toLowerCase()))
    );
  }, [participants, searchParticipantTerm]);

  const participantsDisponiblesFiltres = useMemo(() => {
    if (!searchParticipantTerm) return tousParticipants;
    return tousParticipants.filter(p =>
      `${p.prenom} ${p.nom}`.toLowerCase().includes(searchParticipantTerm.toLowerCase()) ||
      (p.classe && p.classe.toLowerCase().includes(searchParticipantTerm.toLowerCase()))
    );
  }, [tousParticipants, searchParticipantTerm]);

  const chargerClassesDisponibles = async () => {
    if (!selectedActivite) return;
    
    // Récupérer toutes les classes des élèves du voyage
    const { data: elevesData } = await supabase
      .from('voyage_participants')
      .select('students!inner(classe)')
      .eq('voyage_id', voyageId)
      .eq('statut', 'confirme');
    
    const classesSet = new Set<string>();
    elevesData?.forEach((p: any) => {
      if (p.students.classe) {
        classesSet.add(p.students.classe);
      }
    });
    
    setClassesDisponibles(Array.from(classesSet).sort());
  };

  const ajouterClasseEntiere = async (classe: string) => {
    const elevesDeLaClasse = tousParticipants.filter(
      p => p.type === 'student' && p.classe === classe
    );
    
    if (elevesDeLaClasse.length === 0) return;
    
    // Confirmation
    if (!confirm(`Ajouter les ${elevesDeLaClasse.length} élèves de la classe ${classe} à cette activité ?`)) {
      return;
    }
    
    setSaving(true);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const eleve of elevesDeLaClasse) {
      // Vérifier la jauge
      if (selectedActivite.jauge && participants.length + successCount >= selectedActivite.jauge) {
        alert(`Jauge atteinte, arrêt de l'ajout après ${successCount} élèves`);
        break;
      }
      
      const { error } = await supabase
        .from('inscriptions_activites')
        .insert({
          activite_id: selectedActivite.id,
          participant_id: eleve.id,
          participant_type: 'student'
        });
      
      if (!error) {
        successCount++;
      } else if (error.code !== '23505') { // Ignorer les doublons
        errorCount++;
      }
    }
    
    // Recharger les données
    await loadParticipants(selectedActivite.id);
    await loadTousParticipants(selectedActivite.id);
    chargerClassesDisponibles();
    
    alert(`Ajout terminé : ${successCount} élèves ajoutés, ${errorCount} erreurs`);
    setSaving(false);
  };

  const supprimerClassesSelectionnees = async () => {
    if (classesSelectionnees.size === 0) return;
    
    const elevesASupprimer: Participant[] = [];
    classesSelectionnees.forEach(classe => {
      const eleves = participants.filter(
        p => p.type === 'student' && p.classe === classe
      );
      elevesASupprimer.push(...eleves);
    });
    
    // Enlever les doublons
    const idsUniques = new Set();
    const elevesUniques = elevesASupprimer.filter(e => {
      if (idsUniques.has(e.id)) return false;
      idsUniques.add(e.id);
      return true;
    });
    
    if (elevesUniques.length === 0) return;
    
    if (!confirm(`Supprimer les ${elevesUniques.length} élèves des classes sélectionnées de cette activité ?`)) {
      return;
    }
    
    setActionLoading(true);
    setSaving(true);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const eleve of elevesUniques) {
      const { error } = await supabase
        .from('inscriptions_activites')
        .delete()
        .eq('activite_id', selectedActivite.id)
        .eq('participant_id', eleve.id)
        .eq('participant_type', 'student');
      
      if (!error) {
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    await loadParticipants(selectedActivite.id);
    await loadTousParticipants(selectedActivite.id);
    chargerClassesDisponibles();
    setClassesSelectionnees(new Set());
    
    alert(`Suppression terminée : ${successCount} élèves supprimés, ${errorCount} erreurs`);
    setSaving(false);
    setActionLoading(false);
    setShowClasseModal(false);
  };

  const toggleClasseSelection = (classe: string) => {
    const newSelection = new Set(classesSelectionnees);
    if (newSelection.has(classe)) {
      newSelection.delete(classe);
    } else {
      newSelection.add(classe);
    }
    setClassesSelectionnees(newSelection);
  };

  const ajouterClassesSelectionnees = async () => {
    if (classesSelectionnees.size === 0) return;
    
    const elevesAAjouter: Participant[] = [];
    classesSelectionnees.forEach(classe => {
      const eleves = tousParticipants.filter(
        p => p.type === 'student' && p.classe === classe
      );
      elevesAAjouter.push(...eleves);
    });
    
    // Enlever les doublons (au cas où un élève serait dans plusieurs classes, improbable)
    const idsUniques = new Set();
    const elevesUniques = elevesAAjouter.filter(e => {
      if (idsUniques.has(e.id)) return false;
      idsUniques.add(e.id);
      return true;
    });
    
    if (!confirm(`Ajouter les ${elevesUniques.length} élèves des classes sélectionnées à cette activité ?`)) {
      return;
    }
    
    setSaving(true);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const eleve of elevesUniques) {
      // Vérifier la jauge
      if (selectedActivite.jauge && participants.length + successCount >= selectedActivite.jauge) {
        alert(`Jauge atteinte, arrêt de l'ajout après ${successCount} élèves`);
        break;
      }
      
      const { error } = await supabase
        .from('inscriptions_activites')
        .insert({
          activite_id: selectedActivite.id,
          participant_id: eleve.id,
          participant_type: 'student'
        });
      
      if (!error) {
        successCount++;
      } else if (error.code !== '23505') {
        errorCount++;
      }
    }
    
    await loadParticipants(selectedActivite.id);
    await loadTousParticipants(selectedActivite.id);
    chargerClassesDisponibles();
    setClassesSelectionnees(new Set());
    
    alert(`Ajout terminé : ${successCount} élèves ajoutés, ${errorCount} erreurs`);
    setSaving(false);
    setShowClasseModal(false);
  };

// ========== FONCTIONS POUR LE MODAL DES PERMISSIONS ==========

  const chargerPermissions = async () => {
    // Charger le niveau voyage
    const { data: voyageData } = await supabase
      .from('voyages')
      .select('inscriptions_ouvertes')
      .eq('id', voyageId)
      .single();
    
    setPermissionsVoyage(voyageData?.inscriptions_ouvertes || false);
    
    // Charger les jours, groupes et activités avec leurs permissions
    const { data: joursData } = await supabase
      .from('planning_jours')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date');
    
    if (!joursData) return;
    
      const joursAvecGroupes: JourPermission[] = await Promise.all(
      joursData.map(async (jour) => {
        const { data: groupesData } = await supabase
          .from('groupes_activites')
          .select('*')
          .eq('planning_jour_id', jour.id)
          .order('ordre');
        
        const groupesAvecActivites: GroupePermission[] = await Promise.all(
          (groupesData || []).map(async (groupe) => {
            const { data: activitesData } = await supabase
              .from('activites')
              .select('*')
              .eq('groupe_id', groupe.id)
              .order('heure_debut');
            
            return {
              ...groupe,
              checked: groupe.inscriptions_ouvertes || false,
              activites: (activitesData || []).map(a => ({
                id: a.id,
                titre: a.titre,
                heure_debut: a.heure_debut,
                heure_fin: a.heure_fin,  // ← AJOUTE CETTE LIGNE
                checked: a.inscriptions_ouvertes || false
              }))
            };
          })
        );
        
        return {
          ...jour,
          checked: jour.inscriptions_ouvertes || false,
          groupes: groupesAvecActivites
        };
      })
    );
    
    setPermissionsJours(joursAvecGroupes);
  };

  const updateVoyagePermission = async (value: boolean) => {
    setSavingPermissions(true);
    
    await supabase
      .from('voyages')
      .update({ inscriptions_ouvertes: value })
      .eq('id', voyageId);
    
    setPermissionsVoyage(value);
    
    const updatedJours: JourPermission[] = permissionsJours.map(jour => ({
      ...jour,
      checked: value,
      groupes: jour.groupes.map(groupe => ({
        ...groupe,
        checked: value,
        activites: groupe.activites.map(act => ({
          ...act,
          checked: value
        }))
      }))
    }));
    
    setPermissionsJours(updatedJours);
    
    for (const jour of updatedJours) {
      await supabase
        .from('planning_jours')
        .update({ inscriptions_ouvertes: value })
        .eq('id', jour.id);
      
      for (const groupe of jour.groupes) {
        await supabase
          .from('groupes_activites')
          .update({ inscriptions_ouvertes: value })
          .eq('id', groupe.id);
        
        for (const activite of groupe.activites) {
          await supabase
            .from('activites')
            .update({ inscriptions_ouvertes: value })
            .eq('id', activite.id);
        }
      }
    }
    
    setSavingPermissions(false);
  };

  const updateJourPermission = async (jourId: string, value: boolean) => {
    setSavingPermissions(true);
    
    await supabase
      .from('planning_jours')
      .update({ inscriptions_ouvertes: value })
      .eq('id', jourId);
    
    let updatedJours: JourPermission[] = permissionsJours.map(jour => {
      if (jour.id !== jourId) return jour;
      
      return {
        ...jour,
        checked: value,
        groupes: jour.groupes.map(groupe => ({
          ...groupe,
          checked: value,
          activites: groupe.activites.map(act => ({
            ...act,
            checked: value
          }))
        }))
      };
    });
    
    // Mettre à jour les groupes et activités de ce jour en base
    const jour = updatedJours.find(j => j.id === jourId);
    if (jour) {
      for (const groupe of jour.groupes) {
        await supabase
          .from('groupes_activites')
          .update({ inscriptions_ouvertes: value })
          .eq('id', groupe.id);
        
        for (const activite of groupe.activites) {
          await supabase
            .from('activites')
            .update({ inscriptions_ouvertes: value })
            .eq('id', activite.id);
        }
      }
    }
    
    // Vérifier pour le niveau voyage
    const tousJoursCoches = updatedJours.length > 0 && updatedJours.every(j => j.checked);
    const tousJoursDecoches = updatedJours.length > 0 && updatedJours.every(j => !j.checked);
    
    let nouvelleValeurVoyage = permissionsVoyage;
    if (tousJoursCoches && !permissionsVoyage) nouvelleValeurVoyage = true;
    if (tousJoursDecoches && permissionsVoyage) nouvelleValeurVoyage = false;
    
    if (nouvelleValeurVoyage !== permissionsVoyage) {
      await supabase
        .from('voyages')
        .update({ inscriptions_ouvertes: nouvelleValeurVoyage })
        .eq('id', voyageId);
      setPermissionsVoyage(nouvelleValeurVoyage);
    }
    
    setPermissionsJours(updatedJours);
    setSavingPermissions(false);
  };

  const updateGroupePermission = async (groupeId: string, value: boolean, jourId: string) => {
    setSavingPermissions(true);
    
    await supabase
      .from('groupes_activites')
      .update({ inscriptions_ouvertes: value })
      .eq('id', groupeId);
    
    let updatedJours: JourPermission[] = permissionsJours.map(jour => {
      if (jour.id !== jourId) return jour;
      
      return {
        ...jour,
        groupes: jour.groupes.map(groupe => {
          if (groupe.id !== groupeId) return groupe;
          
          return {
            ...groupe,
            checked: value,
            activites: groupe.activites.map(act => ({
              ...act,
              checked: value
            }))
          };
        })
      };
    });
    
    // Mettre à jour les activités du groupe en base
    const jour = updatedJours.find(j => j.id === jourId);
    const groupe = jour?.groupes?.find((g: any) => g.id === groupeId);
    if (groupe) {
      for (const activite of groupe.activites) {
        await supabase
          .from('activites')
          .update({ inscriptions_ouvertes: value })
          .eq('id', activite.id);
      }
    }
    
    // Vérifier pour le jour si tous ses groupes sont cochés/décochés
    updatedJours = updatedJours.map(jour => {
      if (jour.id !== jourId) return jour;
      
      const tousCoches = jour.groupes.length > 0 && jour.groupes.every(g => g.checked);
      const tousDecoches = jour.groupes.length > 0 && jour.groupes.every(g => !g.checked);
      
      let nouvelleValeurJour = jour.checked;
      if (tousCoches && !jour.checked) nouvelleValeurJour = true;
      if (tousDecoches && jour.checked) nouvelleValeurJour = false;
      
      if (nouvelleValeurJour !== jour.checked) {
        supabase
          .from('planning_jours')
          .update({ inscriptions_ouvertes: nouvelleValeurJour })
          .eq('id', jour.id);
      }
      
      return {
        ...jour,
        checked: nouvelleValeurJour,
        groupes: jour.groupes
      };
    });
    
    // Vérifier pour le niveau voyage
    const tousJoursCoches = updatedJours.length > 0 && updatedJours.every(j => j.checked);
    const tousJoursDecoches = updatedJours.length > 0 && updatedJours.every(j => !j.checked);
    
    let nouvelleValeurVoyage = permissionsVoyage;
    if (tousJoursCoches && !permissionsVoyage) nouvelleValeurVoyage = true;
    if (tousJoursDecoches && permissionsVoyage) nouvelleValeurVoyage = false;
    
    if (nouvelleValeurVoyage !== permissionsVoyage) {
      await supabase
        .from('voyages')
        .update({ inscriptions_ouvertes: nouvelleValeurVoyage })
        .eq('id', voyageId);
      setPermissionsVoyage(nouvelleValeurVoyage);
    }
    
    setPermissionsJours(updatedJours);
    setSavingPermissions(false);
  };

  const updateActivitePermission = async (activiteId: string, value: boolean) => {
    setSavingPermissions(true);
    
    await supabase
      .from('activites')
      .update({ inscriptions_ouvertes: value })
      .eq('id', activiteId);
    
    let updatedJours: JourPermission[] = permissionsJours.map(jour => ({
      ...jour,
      groupes: jour.groupes.map(groupe => ({
        ...groupe,
        activites: groupe.activites.map(act => ({
          ...act,
          checked: act.id === activiteId ? value : act.checked
        }))
      }))
    }));
    
    // Vérifier pour chaque groupe si toutes ses activités sont cochées/décochées
    updatedJours = updatedJours.map(jour => ({
      ...jour,
      groupes: jour.groupes.map(groupe => {
        const toutesCochees = groupe.activites.length > 0 && groupe.activites.every(act => act.checked);
        const toutesDecochees = groupe.activites.length > 0 && groupe.activites.every(act => !act.checked);
        
        let nouvelleValeurGroupe = groupe.checked;
        if (toutesCochees && !groupe.checked) nouvelleValeurGroupe = true;
        if (toutesDecochees && groupe.checked) nouvelleValeurGroupe = false;
        
        if (nouvelleValeurGroupe !== groupe.checked) {
          // Mettre à jour en base
          supabase
            .from('groupes_activites')
            .update({ inscriptions_ouvertes: nouvelleValeurGroupe })
            .eq('id', groupe.id);
        }
        
        return {
          ...groupe,
          checked: nouvelleValeurGroupe,
          activites: groupe.activites
        };
      })
    }));
    
    // Vérifier pour chaque jour si tous ses groupes sont cochés/décochés
    updatedJours = updatedJours.map(jour => {
      const tousCoches = jour.groupes.length > 0 && jour.groupes.every(g => g.checked);
      const tousDecoches = jour.groupes.length > 0 && jour.groupes.every(g => !g.checked);
      
      let nouvelleValeurJour = jour.checked;
      if (tousCoches && !jour.checked) nouvelleValeurJour = true;
      if (tousDecoches && jour.checked) nouvelleValeurJour = false;
      
      if (nouvelleValeurJour !== jour.checked) {
        supabase
          .from('planning_jours')
          .update({ inscriptions_ouvertes: nouvelleValeurJour })
          .eq('id', jour.id);
      }
      
      return {
        ...jour,
        checked: nouvelleValeurJour,
        groupes: jour.groupes
      };
    });
    
    // Vérifier pour le niveau voyage si tous les jours sont cochés/décochés
    const tousJoursCoches = updatedJours.length > 0 && updatedJours.every(j => j.checked);
    const tousJoursDecoches = updatedJours.length > 0 && updatedJours.every(j => !j.checked);
    
    let nouvelleValeurVoyage = permissionsVoyage;
    if (tousJoursCoches && !permissionsVoyage) nouvelleValeurVoyage = true;
    if (tousJoursDecoches && permissionsVoyage) nouvelleValeurVoyage = false;
    
    if (nouvelleValeurVoyage !== permissionsVoyage) {
      await supabase
        .from('voyages')
        .update({ inscriptions_ouvertes: nouvelleValeurVoyage })
        .eq('id', voyageId);
      setPermissionsVoyage(nouvelleValeurVoyage);
    }
    
    setPermissionsJours(updatedJours);
    setSavingPermissions(false);
  };

  const togglePermissionsJour = (jourId: string) => {
    const newExpanded = new Set(expandedPermissionsJours);
    if (newExpanded.has(jourId)) newExpanded.delete(jourId);
    else newExpanded.add(jourId);
    setExpandedPermissionsJours(newExpanded);
  };

  const togglePermissionsGroupe = (groupeId: string) => {
    const newExpanded = new Set(expandedPermissionsGroupes);
    if (newExpanded.has(groupeId)) newExpanded.delete(groupeId);
    else newExpanded.add(groupeId);
    setExpandedPermissionsGroupes(newExpanded);
  };


  if (!isResponsable) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès réservé</h3>
        <p className="text-gray-600">Seuls les responsables peuvent gérer les inscriptions.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  const hasSearch = searchTerm.length >= 3;

  return (
    <div className="space-y-4">

      <button
        onClick={() => setShowPermissionsModal(true)}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 mt-3"
      >
        🔓 Gérer les permissions d'inscription
      </button>
      {/* Barre de recherche globale */}
      <div className="sticky top-0 z-10 bg-white p-4 border rounded-lg shadow-sm">
        <input
          type="text"
          placeholder="🔍 Rechercher une activité (titre, description, jour, groupe)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value.length >= 3) {
              performSearch(e.target.value);
            }
          }}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Deux panneaux */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Panneau gauche - Navigation */}
        <div className="md:w-1/3 bg-white rounded-lg border overflow-hidden">
          <div className="p-3 bg-gray-50 border-b font-medium">📁 Activités</div>
          <div className="h-[600px] overflow-y-auto">
            {hasSearch ? (
              <div className="p-3 space-y-1">
                {searchResults.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      console.log('Activité sélectionnée (search):', act);
                      setSelectedActivite(act);
                    }}
                    className={`w-full text-left p-2 rounded hover:bg-gray-100 ${
                      selectedActivite?.id === act.id ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <div className="font-medium">{act.titre}</div>
                    <div className="text-xs text-gray-500">
                      {act.date ? format(parseISO(act.date), 'EEEE dd MMMM', { locale: fr }) : 'Date inconnue'} • {act.heure_debut?.slice(0, 5)}-{act.heure_fin?.slice(0, 5)}
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-center text-gray-500 py-4">Aucun résultat</p>
                )}
              </div>
            ) : (
              <div>
                {jours.map((jour) => {
                  const dateObj = parseISO(jour.date);
                  const jourLabel = format(dateObj, 'EEEE dd MMMM', { locale: fr });
                  const isJourExpanded = expandedJours.has(jour.id);

                  return (
                    <div key={jour.id}>
                      <button
                        onClick={() => toggleJour(jour.id)}
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-left font-medium"
                      >
                        <span>{isJourExpanded ? '▼' : '▶'}</span>
                        <span className="capitalize">{jourLabel}</span>
                      </button>
                      {isJourExpanded && (
                        <div className="pl-6">
                          {jour.groupes.map((groupe: any) => {
                            const isGroupeExpanded = expandedGroupes.has(groupe.id);
                            return (
                              <div key={groupe.id}>
                                <button
                                  onClick={() => toggleGroupe(groupe.id)}
                                  className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-left text-sm"
                                >
                                  <span className="text-xs">{isGroupeExpanded ? '▼' : '▶'}</span>
                                  <span className="text-blue-600">{groupe.nom}</span>
                                  <span className="text-xs text-gray-400 ml-auto">
                                    {groupe.nb_inscriptions_max} max
                                  </span>
                                </button>
                                {isGroupeExpanded && (
                                  <div className="pl-6">
                                    {groupe.activites.map((act: any) => (
                                      <button
                                        key={act.id}
                                        onClick={() => {
                                          console.log('Activité sélectionnée (nav):', { ...act, groupe_nom: groupe.nom, date: jour.date });
                                          setSelectedActivite({ ...act, groupe_nom: groupe.nom, date: jour.date });
                                        }}
                                        className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${
                                          selectedActivite?.id === act.id ? 'bg-blue-50 text-blue-700' : ''
                                        }`}
                                      >
                                        <span className="truncate">{act.titre}</span>
                                        <span className="text-xs text-gray-400 ml-2">
                                          {act.heure_debut.slice(0, 5)}-{act.heure_fin.slice(0, 5)}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panneau droit - Détail de l'activité */}
        <div className="md:w-2/3">
          {selectedActivite ? (
            <div className="bg-white rounded-lg border overflow-hidden">
              {/* En-tête */}
              <div className={`p-4 text-white ${selectedActivite.est_obligatoire ? 'bg-gradient-to-r from-gray-600 to-gray-800' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                <h2 className="text-xl font-bold">{selectedActivite.titre}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-blue-100">
                  <span>📅 {format(parseISO(selectedActivite.date), 'EEEE dd MMMM', { locale: fr })}</span>
                  <span>⏰ {selectedActivite.heure_debut.slice(0, 5)} - {selectedActivite.heure_fin.slice(0, 5)}</span>
                  <span>📁 {selectedActivite.groupe_nom}</span>
                  {selectedActivite.jauge && (
                    <span className={`px-2 py-0.5 rounded ${participants.length >= selectedActivite.jauge ? 'bg-red-500' : 'bg-blue-500'}`}>
                      🎫 {participants.length}/{selectedActivite.jauge}
                    </span>
                  )}
                  {selectedActivite.est_obligatoire && (
                    <span className="bg-gray-700 px-2 py-0.5 rounded">Obligatoire</span>
                  )}
                </div>
                {selectedActivite.description && (
                  <p className="text-sm mt-2 text-blue-50">{selectedActivite.description}</p>
                )}
              </div>

              {/* Pour les activités obligatoires : affichage simplifié */}
              {selectedActivite.est_obligatoire ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-lg font-medium">Activité obligatoire</p>
                  <p className="text-sm">Tous les participants sont automatiquement inscrits.</p>
                  <p className="text-xs mt-2 text-gray-400">Aucune gestion d'inscription nécessaire.</p>
                </div>
              ) : (
                <>
                  {/* Barre de recherche participants */}
                  <div className="p-4 border-b">
                    <input
                      type="text"
                      placeholder="🔍 Rechercher un participant..."
                      value={searchParticipantTerm}
                      onChange={(e) => setSearchParticipantTerm(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Liste des participants */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Participants ({participants.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {participantsFiltres.map((p) => (
                        <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">
                              {p.prenom} {p.nom}
                            </span>
                            {p.classe && (
                              <span className="ml-2 text-xs text-gray-500">{p.classe}</span>
                            )}
                            {p.type === 'employee' && (
                              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                Encadrant
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => retirerParticipant(p.id, p.type)}
                            disabled={actionLoading || saving}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {participantsFiltres.length === 0 && (
                        <p className="text-center text-gray-500 py-4">Aucun participant</p>
                      )}
                    </div>
                  </div>

                  {/* Ajout de participant - visible seulement si jauge non atteinte */}
                  {(!selectedActivite.jauge || participants.length < selectedActivite.jauge) && tousParticipants.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        ➕ Ajouter un participant
                        {selectedActivite.jauge && (
                          <span className="text-xs text-gray-500">
                            ({participants.length}/{selectedActivite.jauge} places)
                          </span>
                        )}
                      </h3>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          const [id, type] = e.target.value.split('|');
                          ajouterParticipant(id, type);
                          e.target.value = '';
                        }
                      }}
                      value=""
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">-- Sélectionner un participant --</option>
                      {participantsDisponiblesFiltres.map((p) => (
                        <option key={p.id} value={`${p.id}|${p.type}`}>
                          {p.prenom} {p.nom} {p.classe ? `(${p.classe})` : '(Encadrant)'}
                        </option>
                      ))}
                    </select>
                      {selectedActivite.jauge && participants.length >= selectedActivite.jauge && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Jauge atteinte ({selectedActivite.jauge}/{selectedActivite.jauge})
                        </p>
                      )}
                    </div>
                  )}

                  {tousParticipants.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                      <button
                        onClick={() => setShowClasseModal(true)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                      >
                        📚 Ajouter / supprimer des classes entières
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p>Sélectionnez une activité dans le panneau de gauche</p>
            </div>
          )}
        </div>

      </div>

            
      {/* Modal pour la sélection de classes */}
      {showClasseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Ajouter des classes</h3>
                <button
                  onClick={() => {
                    setShowClasseModal(false);
                    setClassesSelectionnees(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Sélectionnez les classes à ajouter à cette activité
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-2">
                {classesDisponibles.map(classe => (
                  <button
                    key={classe}
                    onClick={() => toggleClasseSelection(classe)}
                    className={`px-4 py-2 rounded-lg border transition ${
                      classesSelectionnees.has(classe)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {classe}
                  </button>
                ))}
              </div>
              {classesDisponibles.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Aucune classe disponible à ajouter
                </p>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowClasseModal(false);
                  setClassesSelectionnees(new Set());
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={ajouterClassesSelectionnees}
                disabled={classesSelectionnees.size === 0 || actionLoading || saving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Ajouter
              </button>
              <button
                onClick={supprimerClassesSelectionnees}
                disabled={classesSelectionnees.size === 0 || actionLoading || saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour la gestion des permissions d'inscription */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">🔓 Gestion des inscriptions</h3>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Cochez/décochez pour autoriser ou bloquer les inscriptions des élèves
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Niveau Voyage (global) */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissionsVoyage}
                      onChange={(e) => updateVoyagePermission(e.target.checked)}
                      disabled={savingPermissions}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white font-semibold">🌍 Toutes les inscriptions (global)</span>
                  </label>
                </div>
                
                {/* Jours */}
                {permissionsJours.map((jour: JourPermission) => {
                  const dateObj = parseISO(jour.date);
                  const jourLabel = format(dateObj, 'EEEE dd MMMM', { locale: fr });
                  const isExpanded = expandedPermissionsJours.has(jour.id);
                  
                  return (
                    <div key={jour.id} className="bg-white rounded-lg border overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                        <button
                          onClick={() => togglePermissionsJour(jour.id)}
                          className="flex items-center gap-2 text-left font-medium"
                        >
                          <span>{isExpanded ? '▼' : '▶'}</span>
                          <span className="capitalize">{jourLabel}</span>
                        </button>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={jour.checked}
                            onChange={(e) => updateJourPermission(jour.id, e.target.checked)}
                            disabled={savingPermissions}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-600">Inscriptions</span>
                        </label>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-3 space-y-3">
                          {jour.groupes.map((groupe: GroupePermission) => {
                            const isGroupeExpanded = expandedPermissionsGroupes.has(groupe.id);
                            
                            return (
                              <div key={groupe.id} className="border rounded-lg overflow-hidden">
                                <div className="bg-blue-50 px-3 py-2 border-b flex justify-between items-center">
                                  <button
                                    onClick={() => togglePermissionsGroupe(groupe.id)}
                                    className="flex items-center gap-2 text-left"
                                  >
                                    <span className="text-xs">{isGroupeExpanded ? '▼' : '▶'}</span>
                                    <span className="font-medium">{groupe.nom}</span>
                                  </button>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={groupe.checked}
                                      onChange={(e) => updateGroupePermission(groupe.id, e.target.checked, jour.id)}
                                      disabled={savingPermissions}
                                      className="w-4 h-4 rounded"
                                    />
                                    <span className="text-xs text-gray-600">Inscriptions</span>
                                  </label>
                                </div>
                                
                                {isGroupeExpanded && (
                                  <div className="p-2 space-y-2">
                                    {groupe.activites.map((activite: ActivitePermission) => (
                                      <div key={activite.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div>
                                          <span className="text-sm">{activite.titre}</span>
                                          <span className="text-xs text-gray-400 ml-2">
                                            {activite.heure_debut.slice(0, 5)}-{activite.heure_fin.slice(0, 5)}
                                          </span>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={activite.checked}
                                            onChange={(e) => updateActivitePermission(activite.id, e.target.checked)}
                                            disabled={savingPermissions}
                                            className="w-4 h-4 rounded"
                                          />
                                          <span className="text-xs text-gray-600">Inscriptions</span>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}