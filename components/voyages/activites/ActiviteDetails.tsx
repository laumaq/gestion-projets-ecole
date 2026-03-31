// components/voyages/activites/ActiviteDetails.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { X, UserPlus, Search } from 'lucide-react';

interface Props {
  activiteId: string;
  voyageId: string;
  isResponsable: boolean;
  onUpdate: () => void;
}

interface Participant {
  id: string;
  nom: string;
  prenom: string;
  type: 'student' | 'employee';
  classe?: string;
  eleve_id?: number;
}

export default function ActiviteDetails({ activiteId, voyageId, isResponsable, onUpdate }: Props) {
  const [activite, setActivite] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tousParticipants, setTousParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadActivite();
    loadParticipants();
    loadTousParticipants();
  }, [activiteId]);

  const loadActivite = async () => {
    const { data } = await supabase
      .from('activites')
      .select('*, groupes_activites!inner(nom, planning_jours!inner(date))')
      .eq('id', activiteId)
      .single();
    setActivite(data);
  };

  const loadParticipants = async () => {
    // Charger les participants déjà inscrits (élèves + employés)
    const { data } = await supabase
      .from('inscriptions_activites')
      .select(`
        participant_id,
        participant_type,
        students:students!inscriptions_activites_participant_id_fkey (nom, prenom, classe),
        employees:employees!inscriptions_activites_participant_id_fkey (nom, prenom)
      `)
      .eq('activite_id', activiteId);

    const formated: Participant[] = (data || []).map((p: any) => {
      if (p.participant_type === 'student') {
        return {
          id: p.participant_id,
          nom: p.students.nom,
          prenom: p.students.prenom,
          type: 'student',
          classe: p.students.classe,
          eleve_id: parseInt(p.participant_id)
        };
      } else {
        return {
          id: p.participant_id,
          nom: p.employees.nom,
          prenom: p.employees.prenom,
          type: 'employee'
        };
      }
    });

    setParticipants(formated);
  };

  const loadTousParticipants = async () => {
    // Charger tous les participants potentiels (élèves du voyage + employés du voyage)
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

    const tous = [...eleves, ...employes];
    // Filtrer ceux déjà inscrits
    const participantsIds = new Set(participants.map(p => p.id));
    setTousParticipants(tous.filter(p => !participantsIds.has(p.id)));
    setLoading(false);
  };

  const retirerParticipant = async (participantId: string, participantType: string) => {
    if (!confirm('Retirer ce participant de l\'activité ?')) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('inscriptions_activites')
      .delete()
      .eq('activite_id', activiteId)
      .eq('participant_id', participantId)
      .eq('participant_type', participantType);

    if (!error) {
      await loadParticipants();
      await loadTousParticipants();
      onUpdate();
    }
    setSaving(false);
  };

  const ajouterParticipant = async (participantId: string, participantType: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('inscriptions_activites')
      .insert({
        activite_id: activiteId,
        participant_id: participantId,
        participant_type: participantType
      });

    if (!error) {
      await loadParticipants();
      await loadTousParticipants();
      onUpdate();
    } else if (error.code === '23505') {
      alert('Ce participant est déjà inscrit');
    } else {
      alert('Erreur lors de l\'inscription');
    }
    setSaving(false);
  };

  const participantsFiltres = useMemo(() => {
    if (!searchTerm) return participants;
    return participants.filter(p =>
      `${p.prenom} ${p.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.classe && p.classe.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [participants, searchTerm]);

  const participantsDisponiblesFiltres = useMemo(() => {
    if (!searchTerm) return tousParticipants;
    return tousParticipants.filter(p =>
      `${p.prenom} ${p.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.classe && p.classe.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tousParticipants, searchTerm]);

  if (loading) return <div className="text-center py-8">Chargement...</div>;
  if (!activite) return <div className="text-center py-8">Activité introuvable</div>;

  const dateObj = new Date(activite.groupes_activites.planning_jours.date);
  const jourLabel = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* En-tête de l'activité */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
        <h2 className="text-xl font-bold">{activite.titre}</h2>
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-blue-100">
          <span>📅 {jourLabel}</span>
          <span>⏰ {activite.heure_debut.slice(0, 5)} - {activite.heure_fin.slice(0, 5)}</span>
          <span>📁 {activite.groupes_activites.nom}</span>
          {activite.jauge && <span>🎫 Jauge: {activite.jauge}</span>}
          {activite.est_obligatoire && <span className="bg-red-500 px-2 py-0.5 rounded">Obligatoire</span>}
        </div>
        {activite.description && <p className="text-sm mt-2 text-blue-50">{activite.description}</p>}
      </div>

      {/* Barre de recherche */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un participant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Liste des participants */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-3">
          Participants ({participants.length})
        </h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
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
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {participantsFiltres.length === 0 && (
            <p className="text-center text-gray-500 py-4">Aucun participant</p>
          )}
        </div>
      </div>

      {/* Ajout de participant */}
      {tousParticipants.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Ajouter un participant
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
        </div>
      )}
    </div>
  );
}