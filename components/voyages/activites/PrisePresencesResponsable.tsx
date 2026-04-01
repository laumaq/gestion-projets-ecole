// components/activites/PrisePresencesResponsable.tsx

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

interface Presence {
  [key: string]: boolean; // `${activiteId}_${participantId}` -> present
}

export default function PrisePresencesResponsable({ voyageId, isResponsable }: Props) {
  const [jours, setJours] = useState<any[]>([]);
  const [selectedActivite, setSelectedActivite] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJours, setExpandedJours] = useState<Set<string>>(new Set());
  const [expandedGroupes, setExpandedGroupes] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [presences, setPresences] = useState<Presence>({});
  const [saving, setSaving] = useState(false);
  const [searchParticipantTerm, setSearchParticipantTerm] = useState('');

  useEffect(() => {
    loadJours();
  }, [voyageId]);

  useEffect(() => {
    if (selectedActivite) {
      loadParticipants(selectedActivite.id);
      loadPresences(selectedActivite.id);
    }
  }, [selectedActivite]);

  const loadJours = async () => {
    const { data } = await supabase
      .from('planning_jours')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date');
    
    if (data) {
      const joursAvecGroupes = await Promise.all(
        data.map(async (jour) => {
          const { data: groupes } = await supabase
            .from('groupes_activites')
            .select('*')
            .eq('planning_jour_id', jour.id)
            .order('ordre');
          
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
    
    const formatted = (data || []).map((act: any) => ({
      ...act,
      groupe_nom: act.groupes_activites?.nom,
      date: act.groupes_activites?.planning_jours?.date
    }));
    
    setSearchResults(formatted);
  };

  const loadParticipants = async (activiteId: string) => {
    if (!activiteId) return;
    
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
    let participantsList = [...eleves, ...employes];
    
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
  };

  const loadPresences = async (activiteId: string) => {
    const { data } = await supabase
      .from('presences_activites')
      .select('eleve_id, present')
      .eq('activite_id', activiteId);

    const newPresences: Presence = {};
    if (data) {
      data.forEach(p => {
        newPresences[`${activiteId}_${p.eleve_id}`] = p.present;
      });
    }
    setPresences(newPresences);
  };

  const togglePresence = async (activiteId: string, participant: Participant) => {
    if (participant.type !== 'student') return;
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
      console.error('Erreur:', error);
    }
    setSaving(false);
  };

  const toutPresent = async (activiteId: string) => {
    const eleves = participants.filter(p => p.type === 'student');
    if (eleves.length === 0) return;

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
    if (results.some(r => r.error)) {
      await loadPresences(activiteId);
    }
    setSaving(false);
  };

  const toutAbsent = async (activiteId: string) => {
    const eleves = participants.filter(p => p.type === 'student');
    if (eleves.length === 0) return;

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
    if (results.some(r => r.error)) {
      await loadPresences(activiteId);
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

  if (!isResponsable) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès réservé</h3>
        <p className="text-gray-600">Seuls les responsables peuvent accéder à la prise de présence globale.</p>
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
                    onClick={() => setSelectedActivite(act)}
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
                                </button>
                                {isGroupeExpanded && (
                                  <div className="pl-6">
                                    {groupe.activites.map((act: any) => (
                                      <button
                                        key={act.id}
                                        onClick={() => setSelectedActivite({ ...act, groupe_nom: groupe.nom, date: jour.date })}
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

        {/* Panneau droit - Prise de présence */}
        <div className="md:w-2/3">
          {selectedActivite ? (
            <div className="bg-white rounded-lg border overflow-hidden">
              {/* En-tête */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                <h2 className="text-xl font-bold">{selectedActivite.titre}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-blue-100">
                  <span>📅 {format(parseISO(selectedActivite.date), 'EEEE dd MMMM', { locale: fr })}</span>
                  <span>⏰ {selectedActivite.heure_debut.slice(0, 5)} - {selectedActivite.heure_fin.slice(0, 5)}</span>
                  <span>📁 {selectedActivite.groupe_nom}</span>
                  {selectedActivite.jauge && (
                    <span className="bg-blue-500 px-2 py-0.5 rounded">
                      🎫 {participants.filter(p => p.type === 'student').length}/{selectedActivite.jauge}
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

              {/* Liste des participants avec toggles de présence */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">
                    Participants ({participants.filter(p => p.type === 'student').length})
                  </h3>
                  {participants.filter(p => p.type === 'student').length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toutPresent(selectedActivite.id)}
                        disabled={saving}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Tout présent
                      </button>
                      <button
                        onClick={() => toutAbsent(selectedActivite.id)}
                        disabled={saving}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        Tout absent
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {participantsFiltres.map((p) => {
                    const estPresent = p.type === 'student' 
                      ? presences[`${selectedActivite.id}_${p.eleve_id}`] || false
                      : false;
                    
                    return (
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
                        {p.type === 'student' ? (
                          <button
                            onClick={() => togglePresence(selectedActivite.id, p)}
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
                      </div>
                    );
                  })}
                  {participantsFiltres.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Aucun participant</p>
                  )}
                </div>
              </div>
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