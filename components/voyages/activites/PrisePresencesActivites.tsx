//components/voyages/activites/PrisePresencesActivites.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  voyageId: string;
  employeId: string;
  userType: 'employee';
}

interface Activite {
  id: string;
  titre: string;
  description: string;
  heure_debut: string;
  heure_fin: string;
  date: string;
  groupe_nom: string;
  est_obligatoire: boolean;
}

interface Participant {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  type: 'student' | 'employee';
  eleve_id?: number;
}

interface Presence {
  [key: string]: boolean;
}

export default function PrisePresencesActivites({ voyageId, employeId, userType }: Props) {
  const [activites, setActivites] = useState<Activite[]>([]);
  const [participantsParActivite, setParticipantsParActivite] = useState<Map<string, Participant[]>>(new Map());
  const [presences, setPresences] = useState<Presence>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedJours, setExpandedJours] = useState<Set<string>>(new Set());
  const [expandedActivites, setExpandedActivites] = useState<Set<string>>(new Set());
  const [filtreClasse, setFiltreClasse] = useState<string>('all');
  const [classes, setClasses] = useState<string[]>([]);
  const [searchParticipantTerm, setSearchParticipantTerm] = useState('');

  const activitesParDate = useMemo(() => {
    const grouped: { [date: string]: Activite[] } = {};
    activites.forEach(act => {
      if (!grouped[act.date]) grouped[act.date] = [];
      grouped[act.date].push(act);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [activites]);

  useEffect(() => {
    loadActivites();
  }, [voyageId]);

  useEffect(() => {
    if (activites.length > 0) {
      const proche = trouverActiviteProche(activites);
      if (proche) {
        // Déplier le jour correspondant
        const jour = proche.date;
        setExpandedJours(prev => new Set(prev).add(jour));
        // Déplier l'activité
        setExpandedActivites(prev => new Set(prev).add(proche.id));
      }
    }
  }, [activites]);

  const toggleActivite = (activiteId: string) => {
    const newExpanded = new Set(expandedActivites);
    if (newExpanded.has(activiteId)) {
      newExpanded.delete(activiteId);
    } else {
      newExpanded.add(activiteId);
    }
    setExpandedActivites(newExpanded);
  };

  const loadActivites = async () => {
    setLoading(true);
    
    // 1. Récupérer les activités où l'employé est inscrit (inscriptions volontaires)
    const { data: inscriptionsData } = await supabase
      .from('inscriptions_activites')
      .select('activite_id')
      .eq('participant_id', employeId)
      .eq('participant_type', 'employee');

    const activitesInscritesIds = inscriptionsData?.map(i => i.activite_id) || [];
    
    // 2. Récupérer les activités obligatoires du voyage (pas d'inscription)
    const { data: activitesObligatoiresData } = await supabase
      .from('activites')
      .select(`
        id,
        titre,
        description,
        heure_debut,
        heure_fin,
        est_obligatoire,
        groupes_activites!inner (
          nom,
          planning_jours!inner (
            date,
            voyage_id
          )
        )
      `)
      .eq('groupes_activites.planning_jours.voyage_id', voyageId)
      .eq('est_obligatoire', true);

    const activitesObligatoiresIds = activitesObligatoiresData?.map(a => a.id) || [];

    // 3. Fusionner les deux listes (pas de doublons)
    const idsSet = new Set<string>();
    activitesInscritesIds.forEach(id => idsSet.add(id));
    activitesObligatoiresIds.forEach(id => idsSet.add(id));
    const tousIds = Array.from(idsSet);

    if (tousIds.length === 0) {
      setLoading(false);
      return;
    }

    // 4. Récupérer les détails de toutes ces activités
    const { data: activitesData } = await supabase
      .from('activites')
      .select(`
        id,
        titre,
        description,
        heure_debut,
        heure_fin,
        est_obligatoire,
        groupes_activites!inner (
          nom,
          planning_jours!inner (
            date,
            voyage_id
          )
        )
      `)
      .in('id', tousIds)
      .eq('groupes_activites.planning_jours.voyage_id', voyageId)
      .order('heure_debut');

    if (!activitesData) {
      setLoading(false);
      return;
    }

    const activitesFormatees: Activite[] = activitesData.map((act: any) => ({
      id: act.id,
      titre: act.titre,
      description: act.description || '',
      heure_debut: act.heure_debut,
      heure_fin: act.heure_fin,
      date: act.groupes_activites.planning_jours.date,
      groupe_nom: act.groupes_activites.nom,
      est_obligatoire: act.est_obligatoire
    }));

    setActivites(activitesFormatees);

    // 3. Pour chaque activité, charger TOUS les participants (élèves + employés)
    const participantsMap = new Map<string, Participant[]>();
    const allPresences: Presence = {};

    for (const activite of activitesFormatees) {
      let participants: Participant[] = [];

      // Si l'activité est obligatoire, charger TOUS les élèves du voyage
      if (activite.est_obligatoire) {
        // Récupérer tous les élèves participants au voyage
        const { data: voyageParticipants } = await supabase
          .from('voyage_participants')
          .select(`
            eleve_id,
            students!inner (
              matricule,
              nom,
              prenom,
              classe
            )
          `)
          .eq('voyage_id', voyageId)
          .eq('statut', 'confirme');

        participants = (voyageParticipants || []).map((p: any) => ({
          id: p.eleve_id.toString(),
          nom: p.students.nom,
          prenom: p.students.prenom,
          classe: p.students.classe,
          type: 'student',
          eleve_id: p.eleve_id
        }));
      } else {
        // Activité normale : charger les inscrits
        // 1. Récupérer les élèves inscrits
        const { data: elevesData } = await supabase
          .from('inscriptions_activites')
          .select('participant_id')
          .eq('activite_id', activite.id)
          .eq('participant_type', 'student');

        const elevesIds = elevesData?.map(e => e.participant_id) || [];

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
            classe: s.classe,
            type: 'student',
            eleve_id: s.matricule
          }));
        }

        // 2. Récupérer les employés inscrits
        const { data: employesData } = await supabase
          .from('inscriptions_activites')
          .select('participant_id')
          .eq('activite_id', activite.id)
          .eq('participant_type', 'employee');

        const employesIds = employesData?.map(e => e.participant_id) || [];

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
            classe: '👨‍🏫 Encadrant',
            type: 'employee'
          }));
        }

        participants = [...eleves, ...employes];
      }

      // Trier les participants (inchangé)
      participants.sort((a, b) => {
        if (a.type === 'employee' && b.type !== 'employee') return -1;
        if (a.type !== 'employee' && b.type === 'employee') return 1;
        if (a.type === 'employee' && b.type === 'employee') {
          return a.nom.localeCompare(b.nom);
        }
        if (a.classe !== b.classe) return a.classe.localeCompare(b.classe);
        return a.nom.localeCompare(b.nom);
      });

      participantsMap.set(activite.id, participants);

      // Récupérer les présences existantes (inchangé)
      const { data: presencesData } = await supabase
        .from('presences_activites')
        .select('eleve_id, present')
        .eq('activite_id', activite.id);

      if (presencesData) {
        presencesData.forEach(p => {
          allPresences[`${activite.id}_${p.eleve_id}`] = p.present;
        });
      }
    }

    // Après avoir défini participantsMap, extraire les classes
    const classesSet = new Set<string>();
    participantsMap.forEach(participantsList => {
      participantsList
        .filter(p => p.type === 'student' && p.classe)
        .forEach(p => classesSet.add(p.classe as string));
    });
    setClasses(Array.from(classesSet).sort());

    setParticipantsParActivite(participantsMap);

    setPresences(allPresences);
    setLoading(false);
  };


  // Trouver l'activité la plus proche dans le temps
  const trouverActiviteProche = (activitesList: Activite[]) => {
    const maintenant = new Date();
    
    // Convertir chaque activité en objet avec date et heure
    const activitesAvecTimestamp = activitesList.map(act => {
      const [year, month, day] = act.date.split('-').map(Number);
      const [hours, minutes] = act.heure_debut.split(':').map(Number);
      const dateActivite = new Date(year, month - 1, day, hours, minutes);
      return { ...act, timestamp: dateActivite.getTime() };
    });
    
    // Trier par date/heure
    const activitesTriees = [...activitesAvecTimestamp].sort((a, b) => a.timestamp - b.timestamp);
    
    // Trouver la première activité qui commence après maintenant
    const maintenantTimestamp = maintenant.getTime();
    const prochaine = activitesTriees.find(act => act.timestamp >= maintenantTimestamp);
    
    if (prochaine) return prochaine;
    
    // Si aucune après, prendre la dernière (celle qui vient de passer ou la dernière du voyage)
    return activitesTriees[activitesTriees.length - 1];
  };

  const togglePresence = async (activiteId: string, participant: Participant) => {
    if (participant.type !== 'student') return; // Seuls les élèves ont des présences
    if (!participant.eleve_id) return;

    const key = `${activiteId}_${participant.eleve_id}`;
    const nouvelleValeur = !presences[key];

    setPresences(prev => ({ ...prev, [key]: nouvelleValeur }));

    setSaving(true);
    const { error } = await supabase
      .from('presences_activites')
      .upsert({
        activite_id: activiteId,
        eleve_id: participant.eleve_id,
        present: nouvelleValeur,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'activite_id, eleve_id'
      });

    if (error) {
      setPresences(prev => ({ ...prev, [key]: !nouvelleValeur }));
    }
    setSaving(false);
  };

  const toutPresent = async (activiteId: string) => {
    const participants = participantsParActivite.get(activiteId) || [];
    const eleves = participants.filter(p => p.type === 'student');
    if (eleves.length === 0) return;

    if (!confirm(`Marquer TOUS les ${eleves.length} élèves comme PRÉSENTS ?`)) {
      return;
    }    

    setSaving(true);
    
    const updates: Presence = {};
    eleves.forEach(eleve => {
      if (eleve.eleve_id) updates[`${activiteId}_${eleve.eleve_id}`] = true;
    });
    setPresences(prev => ({ ...prev, ...updates }));

    const promises = eleves.map(eleve =>
      supabase
        .from('presences_activites')
        .upsert({
          activite_id: activiteId,
          eleve_id: eleve.eleve_id,
          present: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'activite_id, eleve_id' })
    );

    const results = await Promise.all(promises);
    if (results.some(r => r.error)) await loadActivites();
    setSaving(false);
  };

  const toutAbsent = async (activiteId: string) => {
    const participants = participantsParActivite.get(activiteId) || [];
    const eleves = participants.filter(p => p.type === 'student');
    if (eleves.length === 0) return;

    if (!confirm(`Marquer TOUS les ${eleves.length} élèves comme ABSENTS ?`)) {
      return;
    }

    setSaving(true);
    
    const updates: Presence = {};
    eleves.forEach(eleve => {
      if (eleve.eleve_id) updates[`${activiteId}_${eleve.eleve_id}`] = false;
    });
    setPresences(prev => ({ ...prev, ...updates }));

    const promises = eleves.map(eleve =>
      supabase
        .from('presences_activites')
        .upsert({
          activite_id: activiteId,
          eleve_id: eleve.eleve_id,
          present: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'activite_id, eleve_id' })
    );

    const results = await Promise.all(promises);
    if (results.some(r => r.error)) await loadActivites();
    setSaving(false);
  };

  const toggleJour = (date: string) => {
    const newExpanded = new Set(expandedJours);
    if (newExpanded.has(date)) newExpanded.delete(date);
    else newExpanded.add(date);
    setExpandedJours(newExpanded);
  };


  if (!userType || userType !== 'employee') {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès réservé au personnel</h3>
        <p className="text-gray-600">Seuls les employés peuvent prendre les présences.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  if (activites.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité</h3>
        <p className="text-gray-600">
          Vous n'êtes inscrit comme encadrant à aucune activité.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📋 Prise de présence</h2>
            <p className="text-sm text-gray-600">
              Activités où vous êtes encadrant. Cliquez sur les cases pour marquer les présences.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {activites.length} activité{activites.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {activitesParDate.map(([date, activitesDuJour]) => {
        const dateObj = parseISO(date);
        const jourSemaine = format(dateObj, 'EEEE', { locale: fr });
        const dateStr = format(dateObj, 'dd MMMM yyyy', { locale: fr });
        const isExpanded = expandedJours.has(date);
        
        return (
          <div key={date} className="bg-white rounded-lg border overflow-hidden">
            <button
              onClick={() => toggleJour(date)}
              className="w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition flex justify-between items-center"
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 capitalize">{jourSemaine}</span>
                  <span className="text-sm text-gray-500">{dateStr}</span>
                </div>
              </div>
              <div className="text-gray-400">
                {isExpanded ? '▲' : '▼'}
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 space-y-4">

                {activitesDuJour.map((activite) => {
                  const participants = participantsParActivite.get(activite.id) || [];
                  const eleves = participants.filter(p => p.type === 'student');
                  const presentes = eleves.filter(e => presences[`${activite.id}_${e.eleve_id}`]).length;
                  const estActiviteExpanded = expandedActivites.has(activite.id);
                  
                  // Filtrer les participants localement
                  let participantsFiltres = participants;
                  if (filtreClasse !== 'all') {
                    participantsFiltres = participantsFiltres.filter(p => p.classe === filtreClasse);
                  }
                  if (searchParticipantTerm) {
                    participantsFiltres = participantsFiltres.filter(p =>
                      `${p.prenom} ${p.nom}`.toLowerCase().includes(searchParticipantTerm.toLowerCase()) ||
                      (p.classe && p.classe.toLowerCase().includes(searchParticipantTerm.toLowerCase()))
                    );
                  }
                  
                  return (
                    <div key={activite.id} className="border rounded-lg overflow-hidden">
                      {/* En-tête cliquable */}
                      <button
                        onClick={() => toggleActivite(activite.id)}
                        className="w-full bg-blue-50 px-4 py-3 border-b flex justify-between items-center hover:bg-blue-100 transition"
                      >
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900">{activite.titre}</h3>
                          <p className="text-xs text-gray-600">
                            ⏰ {activite.heure_debut.slice(0, 5)} - {activite.heure_fin.slice(0, 5)} • {activite.groupe_nom}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">
                            {presentes}/{eleves.length} présents
                          </span>
                          {eleves.length > 0 && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toutPresent(activite.id)}
                                disabled={saving}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Tout présent
                              </button>
                              <button
                                onClick={() => toutAbsent(activite.id)}
                                disabled={saving}
                                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                              >
                                Tout absent
                              </button>
                            </div>
                          )}
                          <span className="text-gray-500 text-sm">
                            {estActiviteExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </button>

                      {/* Barre de filtres - AJOUTE ICI */}
                      {estActiviteExpanded && (
                        <div className="p-4 border-b bg-gray-50">
                          <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex gap-2">
                              <button
                                onClick={() => toutPresent(activite.id)}
                                disabled={saving || eleves.length === 0}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Tout présent
                              </button>
                              <button
                                onClick={() => toutAbsent(activite.id)}
                                disabled={saving || eleves.length === 0}
                                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                              >
                                Tout absent
                              </button>
                            </div>
                            
                            {/* Filtre par classe */}
                            {classes.length > 0 && (
                              <select
                                value={filtreClasse}
                                onChange={(e) => setFiltreClasse(e.target.value)}
                                className="px-3 py-1 text-xs border rounded-lg bg-white"
                              >
                                <option value="all">Toutes les classes</option>
                                {classes.map(classe => (
                                  <option key={classe} value={classe}>{classe}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          {/* Barre de recherche */}
                          <div className="mt-3">
                            <input
                              type="text"
                              placeholder="🔍 Rechercher un participant..."
                              value={searchParticipantTerm}
                              onChange={(e) => setSearchParticipantTerm(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Tableau des présences - visible seulement si déplié */}
                      {estActiviteExpanded  && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Participant</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Classe</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-20">Présent</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {participants.map((participant) => {
                                const estPresent = participant.type === 'student' 
                                  ? presences[`${activite.id}_${participant.eleve_id}`] || false
                                  : false;
                                
                                return (
                                  <tr key={participant.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm">
                                      {participant.prenom} {participant.nom}
                                      {participant.type === 'employee' && ' (encadrant)'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-500">
                                      {participant.classe}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {participant.type === 'student' ? (
                                        <button
                                          onClick={() => togglePresence(activite.id, participant)}
                                          disabled={saving}
                                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                                            estPresent
                                              ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                                              : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                                          }`}
                                        >
                                          {estPresent ? '✓' : '✕'}
                                        </button>
                                      ) : (
                                        <span className="text-xs text-gray-400">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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
  );
}