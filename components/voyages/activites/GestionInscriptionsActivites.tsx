'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  voyageId: string;
  isResponsable: boolean;
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

  useEffect(() => {
    loadJours();
  }, [voyageId]);

  useEffect(() => {
    if (selectedActivite) {
      loadParticipants(selectedActivite.id);
      loadTousParticipants(selectedActivite.id);
    }
  }, [selectedActivite]);

  const loadJours = async () => {
    const { data } = await supabase
      .from('planning_jours')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date');
    
    if (data) {
      // Charger les groupes pour chaque jour
      const joursAvecGroupes = await Promise.all(
        data.map(async (jour) => {
          const { data: groupes } = await supabase
            .from('groupes_activites')
            .select('*')
            .eq('planning_jour_id', jour.id)
            .order('ordre');
          
          // Charger les activités pour chaque groupe
          const groupesAvecActivites = await Promise.all(
            (groupes || []).map(async (groupe) => {
              const { data: activites } = await supabase
                .from('activites')
                .select('*')
                .eq('groupe_id', groupe.id)
                .order('heure_debut');
              return { ...groupe, activites: activites || [] };
            })
          );
          return { ...jour, groupes: groupesAvecActivites };
        })
      );
      setJours(joursAvecGroupes);
    }
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

  const loadParticipants = async (activiteId: string) => {
    if (!activiteId) {
      console.error('❌ loadParticipants: activiteId manquant');
      return;
    }
    
    // 1. Récupérer les élèves inscrits
    const { data: elevesData } = await supabase
      .from('inscriptions_activites')
      .select('participant_id')
      .eq('activite_id', activiteId)
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
        type: 'student',
        classe: s.classe,
        eleve_id: s.matricule
      }));
    }

    // 2. Récupérer les employés inscrits
    const { data: employesData } = await supabase
      .from('inscriptions_activites')
      .select('participant_id')
      .eq('activite_id', activiteId)
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
        type: 'employee'
      }));
    }

    // 3. Fusionner et trier
    const participants = [...eleves, ...employes];
    
    // Trier les participants
    participants.sort((a, b) => {
      if (a.type === 'employee' && b.type !== 'employee') return -1;
      if (a.type !== 'employee' && b.type === 'employee') return 1;
      if (a.type === 'employee' && b.type === 'employee') {
        return a.nom.localeCompare(b.nom);
      }
      // Pour les élèves : tri par classe puis nom
      const classeA = a.classe || '';
      const classeB = b.classe || '';
      if (classeA !== classeB) return classeA.localeCompare(classeB);
      return a.nom.localeCompare(b.nom);
    });

    setParticipants(participants);
  };

  const loadTousParticipants = async (activiteId: string) => {
    if (!activiteId) {
      console.error('❌ loadTousParticipants: activiteId manquant');
      return;
    }
    
    // 1. Récupérer les IDs des participants déjà inscrits
    const { data: inscritsData } = await supabase
      .from('inscriptions_activites')
      .select('participant_id, participant_type')
      .eq('activite_id', activiteId);

    const inscritsIds = new Map();
    (inscritsData || []).forEach((i: any) => {
      inscritsIds.set(`${i.participant_id}_${i.participant_type}`, true);
    });

    // 2. Récupérer tous les élèves du voyage (participants confirmés)
    const { data: elevesData } = await supabase
      .from('voyage_participants')
      .select('eleve_id, students!inner(nom, prenom, classe)')
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

    // 3. Récupérer tous les employés du voyage (professeurs participants)
    const { data: employesData } = await supabase
      .from('voyage_professeurs')
      .select('professeur_id, employees!inner(nom, prenom)')
      .eq('voyage_id', voyageId);

    const employes: Participant[] = (employesData || []).map((p: any) => ({
      id: p.professeur_id,
      nom: p.employees.nom,
      prenom: p.employees.prenom,
      type: 'employee'
    }));

    // 4. Fusionner et filtrer ceux qui ne sont pas déjà inscrits
    const tous = [...eleves, ...employes];
    const nonInscrits = tous.filter(p => !inscritsIds.has(`${p.id}_${p.type}`));
    
    // 5. Trier
    nonInscrits.sort((a, b) => {
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

    setTousParticipants(nonInscrits);
  };
  
  const retirerParticipant = async (participantId: string, participantType: string) => {
    if (!confirm('Retirer ce participant de l\'activité ?')) return;
    
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
                            disabled={saving}
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
    </div>
  );
}