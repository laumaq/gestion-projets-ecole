'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  voyageId: string;
}

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  sexe: string;
}

interface Participant {
  id: string;
  eleve_id: number;
  statut: string;
  genre: string;
  classe: string;
  eleve: Eleve;
}

export default function ParticipantsList({ voyageId }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [voyageId]);

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('voyage_participants')
      .select(`
        *,
        eleve:students!inner(matricule, nom, prenom, classe, sexe)
      `)
      .eq('voyage_id', voyageId);

    if (!error && data) {
      setParticipants(data);
    }
    setLoading(false);
  };

  const loadElevesDisponibles = async () => {
    // Récupérer les IDs des élèves déjà participants
    const participantIds = participants.map(p => p.eleve_id);
    
    let query = supabase
      .from('students')
      .select('*')
      .not('matricule', 'in', `(${participantIds.join(',')})`);

    if (selectedClasse) {
      query = query.eq('classe', selectedClasse);
    }

    if (searchTerm) {
      query = query.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query.limit(50);
    if (!error && data) setElevesDisponibles(data);
  };

  const addParticipant = async (eleve: Eleve) => {
    const { error } = await supabase
      .from('voyage_participants')
      .insert({
        voyage_id: voyageId,
        eleve_id: eleve.matricule,
        genre: eleve.sexe,
        classe: eleve.classe,
        statut: 'confirme'
      });

    if (!error) {
      loadParticipants();
      setShowAddModal(false);
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (confirm('Retirer cet élève du voyage ?')) {
      const { error } = await supabase
        .from('voyage_participants')
        .delete()
        .eq('id', participantId);

      if (!error) loadParticipants();
    }
  };

  const updateStatut = async (participantId: string, statut: string) => {
    const { error } = await supabase
      .from('voyage_participants')
      .update({ statut })
      .eq('id', participantId);

    if (!error) loadParticipants();
  };

  const classes = [...new Set(participants.map(p => p.classe))].sort();

  if (loading) return <div className="text-center py-8">Chargement des participants...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <p className="text-gray-600 mt-1">
            {participants.length} élève{participants.length > 1 ? 's' : ''} inscrit{participants.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setSearchTerm('');
            setSelectedClasse('');
            setElevesDisponibles([]);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          + Ajouter des élèves
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-4">
        <select
          value={selectedClasse}
          onChange={(e) => setSelectedClasse(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Toutes les classes</option>
          {classes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Liste des participants */}
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700 border-b">
          <div className="col-span-4">Élève</div>
          <div className="col-span-2">Classe</div>
          <div className="col-span-2">Genre</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-2">Actions</div>
        </div>

        {participants
          .filter(p => !selectedClasse || p.classe === selectedClasse)
          .map((participant) => (
            <div key={participant.id} className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50">
              <div className="col-span-4">
                <div className="font-medium">{participant.eleve.nom} {participant.eleve.prenom}</div>
              </div>
              <div className="col-span-2 text-gray-600">{participant.classe}</div>
              <div className="col-span-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  participant.genre === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                }`}>
                  {participant.genre === 'M' ? 'Garçon' : 'Fille'}
                </span>
              </div>
              <div className="col-span-2">
                <select
                  value={participant.statut}
                  onChange={(e) => updateStatut(participant.id, e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="confirme">✅ Confirmé</option>
                  <option value="liste_attente">⏳ Liste d'attente</option>
                  <option value="annule">❌ Annulé</option>
                </select>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => removeParticipant(participant.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Retirer
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Ajouter des élèves</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              
              {/* Recherche */}
              <div className="mt-4 flex gap-4">
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <select
                  value={selectedClasse}
                  onChange={(e) => setSelectedClasse(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="">Toutes classes</option>
                  {['1PAA','1PAB','1PAC','1PAD','1PAE','1PAF','2PAA','2PAB','2PAC','2PAD','2PAE','2PAF','2PAG','3PAS','3PAT','3PAU','3PAV','3PAW','3PAX','3PAY','3PAZ','4PAS','4PAT','4PAU','4PAV','4PAW','4PAX','4PAY','4PAZ','5PAS','5PAT','5PAU','5PAV','5PAW','5PAX','5PAY','5PAZ','6PAU','6PAV','6PAW','6PAX','6PAY','6PAZ'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={loadElevesDisponibles}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Rechercher
                </button>
              </div>
            </div>

            {/* Résultats */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {elevesDisponibles.map((eleve) => (
                  <div
                    key={eleve.matricule}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{eleve.nom} {eleve.prenom}</div>
                      <div className="text-sm text-gray-600">{eleve.classe} • {eleve.sexe === 'M' ? 'Garçon' : 'Fille'}</div>
                    </div>
                    <button
                      onClick={() => addParticipant(eleve)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Ajouter
                    </button>
                  </div>
                ))}
                {elevesDisponibles.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun élève trouvé
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
