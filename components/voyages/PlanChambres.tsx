'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  configId: string;
  voyageId: string;
}

interface Chambre {
  id: string;
  numero_chambre: string;
  nom_chambre: string | null;
  capacite: number;
  genre: 'M' | 'F' | 'prof' | 'mixte';
  notes: string | null;
}

interface Participant {
  id: string;
  eleve_id: number;
  genre: string;
  classe: string;
  eleve: {
    nom: string;
    prenom: string;
    classe: string;
  };
}

interface Affectation {
  id: string;
  chambre_id: string;
  participant_id: string;
  participant: Participant;
}

export default function PlanChambres({ configId, voyageId }: Props) {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [participantsDisponibles, setParticipantsDisponibles] = useState<Participant[]>([]);
  const [showAddChambre, setShowAddChambre] = useState(false);
  const [selectedChambre, setSelectedChambre] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChambres();
    loadParticipants();
    setUserRole(localStorage.getItem('userRole') || '');
  }, [configId]);

  const loadChambres = async () => {
    const { data, error } = await supabase
      .from('chambres')
      .select('*')
      .eq('hebergement_config_id', configId)
      .order('numero_chambre');

    if (!error && data) {
      setChambres(data);
      await loadAffectations(data.map(c => c.id));
    }
    setLoading(false);
  };

  const loadAffectations = async (chambreIds: string[]) => {
    if (chambreIds.length === 0) return;

    const { data, error } = await supabase
      .from('chambre_affectations')
      .select(`
        *,
        participant:voyage_participants(
          id,
          eleve_id,
          genre,
          classe,
          eleve:students(nom, prenom, classe)
        )
      `)
      .in('chambre_id', chambreIds);

    if (!error && data) {
      setAffectations(data);
    }
  };

  const loadParticipants = async () => {
    // Récupérer les participants déjà affectés
    const affectes = await supabase
      .from('chambre_affectations')
      .select('participant_id');

    const affectesIds = affectes.data?.map(a => a.participant_id) || [];

    // Récupérer les participants non affectés
    const { data, error } = await supabase
      .from('voyage_participants')
      .select(`
        id,
        eleve_id,
        genre,
        classe,
        eleve:students(nom, prenom, classe)
      `)
      .eq('voyage_id', voyageId)
      .eq('statut', 'confirme')
      .not('id', 'in', `(${affectesIds.join(',')})`);

    if (!error && data) {
      setParticipantsDisponibles(data);
    }
  };

  const addChambre = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase
      .from('chambres')
      .insert({
        hebergement_config_id: configId,
        numero_chambre: formData.get('numero'),
        nom_chambre: formData.get('nom') || null,
        capacite: parseInt(formData.get('capacite') as string),
        genre: formData.get('genre'),
        notes: formData.get('notes') || null
      });

    if (!error) {
      loadChambres();
      setShowAddChambre(false);
    }
  };

  const deleteChambre = async (chambreId: string) => {
    if (confirm('Supprimer cette chambre ? Toutes les affectations seront perdues.')) {
      const { error } = await supabase
        .from('chambres')
        .delete()
        .eq('id', chambreId);

      if (!error) loadChambres();
    }
  };

  const assignerEleve = async (chambreId: string, participantId: string) => {
    const { error } = await supabase
      .from('chambre_affectations')
      .insert({
        chambre_id: chambreId,
        participant_id: participantId,
        created_by: localStorage.getItem('userId')
      });

    if (!error) {
      loadChambres();
      loadParticipants();
    }
  };

  const retirerEleve = async (affectationId: string) => {
    const { error } = await supabase
      .from('chambre_affectations')
      .delete()
      .eq('id', affectationId);

    if (!error) {
      loadChambres();
      loadParticipants();
    }
  };

  const getAffectationsForChambre = (chambreId: string) => {
    return affectations.filter(a => a.chambre_id === chambreId);
  };

  const getParticipantsParGenre = (genre: string) => {
    return participantsDisponibles.filter(p => p.genre === genre);
  };

  const getGenreLabel = (genre: string) => {
    switch (genre) {
      case 'M': return 'Garçons';
      case 'F': return 'Filles';
      case 'prof': return 'Professeurs';
      case 'mixte': return 'Mixte';
      default: return genre;
    }
  };

  const getGenreColor = (genre: string) => {
    switch (genre) {
      case 'M': return 'border-blue-300 bg-blue-50';
      case 'F': return 'border-pink-300 bg-pink-50';
      case 'prof': return 'border-purple-300 bg-purple-50';
      case 'mixte': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  if (loading) return <div className="text-center py-8">Chargement des chambres...</div>;

  return (
    <div className="space-y-6">
      {/* Header des chambres */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Plan des chambres</h3>
          <p className="text-sm text-gray-600">
            {chambres.length} chambre{chambres.length > 1 ? 's' : ''} • 
            {affectations.length} élève{affectations.length > 1 ? 's' : ''} affecté{affectations.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddChambre(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Ajouter une chambre
        </button>
      </div>

      {/* Légende */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-2"></div>
          <span>Garçons</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-pink-100 border border-pink-300 rounded mr-2"></div>
          <span>Filles</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded mr-2"></div>
          <span>Professeurs</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
          <span>Mixte</span>
        </div>
      </div>

      {/* Grille des chambres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chambres.map((chambre) => {
          const affectationsChambre = getAffectationsForChambre(chambre.id);
          const placesLibres = chambre.capacite - affectationsChambre.length;
          const isComplete = placesLibres === 0;
          const isProf = chambre.genre === 'prof';
          const participantsPossibles = chambre.genre === 'M' ? getParticipantsParGenre('M') :
                                      chambre.genre === 'F' ? getParticipantsParGenre('F') :
                                      chambre.genre === 'prof' ? [] : // Les profs sont gérés à part
                                      participantsDisponibles; // Mixte

          return (
            <div
              key={chambre.id}
              className={`border-2 rounded-xl p-5 ${getGenreColor(chambre.genre)} ${
                isComplete ? 'opacity-75' : ''
              }`}
            >
              {/* En-tête chambre */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Chambre {chambre.numero_chambre}
                  </h4>
                  {chambre.nom_chambre && (
                    <p className="text-sm text-gray-600">{chambre.nom_chambre}</p>
                  )}
                  <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-white bg-opacity-50 rounded-full">
                    {getGenreLabel(chambre.genre)} • {chambre.capacite} places
                  </span>
                </div>
                <button
                  onClick={() => deleteChambre(chambre.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>

              {/* Liste des occupants */}
              <div className="space-y-2 mb-4 min-h-[100px]">
                {affectationsChambre.map((aff) => (
                  <div
                    key={aff.id}
                    className="flex justify-between items-center p-2 bg-white bg-opacity-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">
                        {aff.participant.eleve.nom} {aff.participant.eleve.prenom}
                      </span>
                      <span className="ml-2 text-xs text-gray-600">
                        {aff.participant.classe}
                      </span>
                    </div>
                    <button
                      onClick={() => retirerEleve(aff.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {affectationsChambre.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Chambre vide
                  </div>
                )}
              </div>

              {/* Barre de progression */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Occupation</span>
                  <span className="font-medium">
                    {affectationsChambre.length}/{chambre.capacite}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${(affectationsChambre.length / chambre.capacite) * 100}%` }}
                  />
                </div>
              </div>

              {/* Ajout d'élèves */}
              {userRole !== 'eleve' && !isComplete && !isProf && (
                <div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        assignerEleve(chambre.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    value=""
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Ajouter un élève...</option>
                    {participantsPossibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.eleve.nom} {p.eleve.prenom} - {p.classe}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Message pour profs */}
              {isProf && (
                <div className="text-sm text-gray-600 italic">
                  Chambre réservée aux professeurs
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal ajout chambre */}
      {showAddChambre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Ajouter une chambre</h3>
            <form onSubmit={addChambre} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de chambre</label>
                <input
                  name="numero"
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: 101, A12, ..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom (optionnel)</label>
                <input
                  name="nom"
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Suite des profs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacité</label>
                <input
                  name="capacite"
                  type="number"
                  min="1"
                  max="8"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Genre</label>
                <select
                  name="genre"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="M">Garçons</option>
                  <option value="F">Filles</option>
                  <option value="prof">Professeurs</option>
                  <option value="mixte">Mixte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Informations supplémentaires..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddChambre(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
