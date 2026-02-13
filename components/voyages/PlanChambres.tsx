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
        participant:voyage_participants!inner(
          id,
          eleve_id,
          genre,
          classe,
          eleve:students!inner(
            nom,
            prenom,
            classe
          )
        )
      `)
      .in('chambre_id', chambreIds);
  
    if (!error && data) {
      const affectationsFormatees = data.map((item: any) => ({
        ...item,
        participant: {
          ...item.participant,
          eleve: Array.isArray(item.participant.eleve) 
            ? item.participant.eleve[0] 
            : item.participant.eleve
        }
      }));
      
      setAffectations(affectationsFormatees);
    }
  };
  
  const loadParticipants = async () => {
    const { data: affectes } = await supabase
      .from('chambre_affectations')
      .select('participant_id');
  
    const affectesIds = affectes?.map(a => a.participant_id) || [];
  
    const { data, error } = await supabase
      .from('voyage_participants')
      .select(`
        id,
        eleve_id,
        genre,
        classe,
        eleve:students!inner (
          nom,
          prenom,
          classe
        )
      `)
      .eq('voyage_id', voyageId)
      .eq('statut', 'confirme')
      .not('id', 'in', `(${affectesIds.join(',')})`);
  
    if (!error && data) {
      const participantsFormates = data.map((item: any) => ({
        id: item.id,
        eleve_id: item.eleve_id,
        genre: item.genre,
        classe: item.classe,
        eleve: Array.isArray(item.eleve) ? item.eleve[0] : item.eleve
      }));
      
      setParticipantsDisponibles(participantsFormates);
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
      case 'M': return 'border-indigo-200 bg-indigo-50/50'; // Indigo au lieu de bleu
      case 'F': return 'border-amber-200 bg-amber-50/50';   // Ambre/ocre au lieu de rose
      case 'prof': return 'border-purple-200 bg-purple-50/50';
      case 'mixte': return 'border-emerald-200 bg-emerald-50/50';
      default: return 'border-gray-200 bg-gray-50/50';
    }
  };

  const getGenreBarColor = (genre: string) => {
    switch (genre) {
      case 'M': return 'bg-indigo-500';
      case 'F': return 'bg-amber-500';
      case 'prof': return 'bg-purple-500';
      case 'mixte': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) return <div className="text-center py-8">Chargement des chambres...</div>;

  return (
    <div className="space-y-4">
      {/* Header des chambres - plus compact */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Plan des chambres</h3>
          <p className="text-xs text-gray-600">
            {chambres.length} chambre{chambres.length > 1 ? 's' : ''} • 
            {affectations.length} élève{affectations.length > 1 ? 's' : ''} affecté{affectations.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddChambre(true)}
          className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700"
        >
          + Ajouter
        </button>
      </div>

      {/* Légende - plus compacte */}
      <div className="flex gap-3 text-xs">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-indigo-200 border border-indigo-300 rounded-full mr-1.5"></div>
          <span>Garçons</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-amber-200 border border-amber-300 rounded-full mr-1.5"></div>
          <span>Filles</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-purple-200 border border-purple-300 rounded-full mr-1.5"></div>
          <span>Profs</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-emerald-200 border border-emerald-300 rounded-full mr-1.5"></div>
          <span>Mixte</span>
        </div>
      </div>

      {/* Grille des chambres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {chambres.map((chambre) => {
          const affectationsChambre = getAffectationsForChambre(chambre.id);
          const placesLibres = chambre.capacite - affectationsChambre.length;
          const isComplete = placesLibres === 0;
          const isProf = chambre.genre === 'prof';
          const participantsPossibles = chambre.genre === 'M' ? getParticipantsParGenre('M') :
                                      chambre.genre === 'F' ? getParticipantsParGenre('F') :
                                      chambre.genre === 'prof' ? [] :
                                      participantsDisponibles;

          return (
            <div
              key={chambre.id}
              className={`border rounded-lg p-3 ${getGenreColor(chambre.genre)}`}
            >
              {/* En-tête chambre - plus compact */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">
                      Ch. {chambre.numero_chambre}
                    </h4>
                    {chambre.nom_chambre && (
                      <span className="text-xs text-gray-600">• {chambre.nom_chambre}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteChambre(chambre.id)}
                  className="text-gray-400 hover:text-red-600 text-xs"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>

              {/* Barre d'occupation - plus compacte, entre le nom et la croix */}
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getGenreBarColor(chambre.genre)} transition-all`}
                      style={{ width: `${(affectationsChambre.length / chambre.capacite) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {affectationsChambre.length}/{chambre.capacite}
                  </span>
                </div>
              </div>

              {/* Liste des occupants - plus compacte */}
              <div className="space-y-1 mb-2 min-h-[60px] max-h-[120px] overflow-y-auto">
                {affectationsChambre.map((aff) => (
                  <div
                    key={aff.id}
                    className="flex justify-between items-center py-1 px-1.5 bg-white bg-opacity-50 rounded text-xs"
                  >
                    <span className="font-medium truncate max-w-[120px]">
                      {aff.participant.eleve.prenom} {aff.participant.eleve.nom.substring(0, 1)}.
                    </span>
                    <button
                      onClick={() => retirerEleve(aff.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                      title="Retirer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {affectationsChambre.length === 0 && (
                  <div className="text-center py-2 text-gray-400 text-xs">
                    Vide
                  </div>
                )}
              </div>

              {/* Ajout d'élèves - plus compact */}
              {userRole !== 'eleve' && !isComplete && !isProf && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      assignerEleve(chambre.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  value=""
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">+ Ajouter...</option>
                  {participantsPossibles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.eleve.prenom} {p.eleve.nom.substring(0, 1)}. - {p.classe}
                    </option>
                  ))}
                </select>
              )}

              {/* Message pour profs */}
              {isProf && (
                <div className="text-xs text-gray-500 italic">
                  Réservée aux professeurs
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal ajout chambre - inchangé */}
      {showAddChambre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Ajouter une chambre</h3>
            <form onSubmit={addChambre} className="space-y-4">
              {/* ... reste du formulaire inchangé ... */}
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
