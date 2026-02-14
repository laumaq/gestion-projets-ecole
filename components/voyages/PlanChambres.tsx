'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  configId: string;
  voyageId: string;
  isResponsable: boolean;
  userType: 'employee' | 'student' | null;
}

interface Chambre {
  id: string;
  numero_chambre: string;
  nom_chambre: string | null;
  capacite: number;
  genre: 'M' | 'F' | 'prof' | 'mixte';
  notes: string | null;
}

interface EleveParticipant {
  id: string;
  eleve_id: number;
  genre: string;
  classe: string;
  type: 'eleve';
  eleve: {
    nom: string;
    prenom: string;
    classe: string;
  };
}

interface ProfesseurParticipant {
  id: string;
  professeur_id: string;
  role: string;
  type: 'professeur';
  professeur: {
    nom: string;
    prenom: string;
    email: string | null;
    initiale: string;
  };
}

type Participant = EleveParticipant | ProfesseurParticipant;

interface Affectation {
  id: string;
  chambre_id: string;
  participant_id: string;
  participant_type: 'eleve' | 'professeur';
  participant: Participant;
}

interface VoyageConfig {
  auto_affectation_eleves: boolean;
  visibilite_restreinte_eleves: boolean;
}

export default function PlanChambres({ configId, voyageId, isResponsable, userType }: Props) {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<EleveParticipant[]>([]);
  const [professeursDisponibles, setProfesseursDisponibles] = useState<ProfesseurParticipant[]>([]);
  const [showAddChambre, setShowAddChambre] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voyageConfig, setVoyageConfig] = useState<VoyageConfig>({
    auto_affectation_eleves: false,
    visibilite_restreinte_eleves: true
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEleveId, setCurrentUserEleveId] = useState<number | null>(null);

  const canEdit = userType === 'employee' && isResponsable;
  const isEleve = userType === 'student';

  useEffect(() => {
    const id = localStorage.getItem('userId');
    setCurrentUserId(id);
    
    // Pour les élèves, récupérer leur eleve_id
    if (userType === 'student' && id) {
      setCurrentUserEleveId(parseInt(id));
    }
    
    loadVoyageConfig();
    loadChambres();
    loadParticipantsDisponibles();
  }, [configId]);

  const loadVoyageConfig = async () => {
    const { data, error } = await supabase
      .from('voyages')
      .select('auto_affectation_eleves, visibilite_restreinte_eleves')
      .eq('id', voyageId)
      .single();

    if (!error && data) {
      setVoyageConfig(data);
    }
  };

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
  
    const { data: elevesData, error: elevesError } = await supabase
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
  
    const { data: professeursData, error: professeursError } = await supabase
      .from('chambre_affectations_professeurs')
      .select(`
        *,
        participant:voyage_professeurs!inner(
          id,
          professeur_id,
          role,
          professeur:employees!inner(
            nom,
            prenom,
            email,
            initiale
          )
        )
      `)
      .in('chambre_id', chambreIds);

    let toutesAffectations: Affectation[] = [];

    if (!elevesError && elevesData) {
      const elevesFormates = elevesData.map((item: any) => ({
        id: item.id,
        chambre_id: item.chambre_id,
        participant_id: item.participant_id,
        participant_type: 'eleve' as const,
        participant: {
          id: item.participant.id,
          eleve_id: item.participant.eleve_id,
          genre: item.participant.genre,
          classe: item.participant.classe,
          type: 'eleve' as const,
          eleve: Array.isArray(item.participant.eleve) 
            ? item.participant.eleve[0] 
            : item.participant.eleve
        }
      }));
      toutesAffectations = [...toutesAffectations, ...elevesFormates];
    }

    if (!professeursError && professeursData) {
      const professeursFormates = professeursData.map((item: any) => ({
        id: item.id,
        chambre_id: item.chambre_id,
        participant_id: item.participant_id,
        participant_type: 'professeur' as const,
        participant: {
          id: item.participant.id,
          professeur_id: item.participant.professeur_id,
          role: item.participant.role,
          type: 'professeur' as const,
          professeur: Array.isArray(item.participant.professeur) 
            ? item.participant.professeur[0] 
            : item.participant.professeur
        }
      }));
      toutesAffectations = [...toutesAffectations, ...professeursFormates];
    }
    
    setAffectations(toutesAffectations);
  };
  
  const loadParticipantsDisponibles = async () => {
    const { data: affectesEleves } = await supabase
      .from('chambre_affectations')
      .select('participant_id');
    
    const { data: affectesProfesseurs } = await supabase
      .from('chambre_affectations_professeurs')
      .select('participant_id');

    const elevesAffectesIds = affectesEleves?.map(a => a.participant_id) || [];
    const professeursAffectesIds = affectesProfesseurs?.map(a => a.participant_id) || [];

    const { data: elevesData, error: elevesError } = await supabase
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
      .eq('statut', 'confirme');

    const { data: professeursData, error: professeursError } = await supabase
      .from('voyage_professeurs')
      .select(`
        id,
        professeur_id,
        role,
        professeur:employees!inner (
          nom,
          prenom,
          email,
          initiale
        )
      `)
      .eq('voyage_id', voyageId);
  
    if (!elevesError && elevesData) {
      const elevesNonAffectes = elevesData.filter(e => !elevesAffectesIds.includes(e.id));
      const elevesFormates = elevesNonAffectes.map((item: any) => ({
        id: item.id,
        eleve_id: item.eleve_id,
        genre: item.genre,
        classe: item.classe,
        type: 'eleve' as const,
        eleve: Array.isArray(item.eleve) ? item.eleve[0] : item.eleve
      }));
      setElevesDisponibles(elevesFormates);
    }

    if (!professeursError && professeursData) {
      const professeursNonAffectes = professeursData.filter(p => !professeursAffectesIds.includes(p.id));
      const professeursFormates = professeursNonAffectes.map((item: any) => ({
        id: item.id,
        professeur_id: item.professeur_id,
        role: item.role,
        type: 'professeur' as const,
        professeur: Array.isArray(item.professeur) ? item.professeur[0] : item.professeur
      }));
      setProfesseursDisponibles(professeursFormates);
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
    if (!canEdit) return;
    if (confirm('Supprimer cette chambre ? Toutes les affectations seront perdues.')) {
      const { error } = await supabase
        .from('chambres')
        .delete()
        .eq('id', chambreId);

      if (!error) loadChambres();
    }
  };

  const assignerParticipant = async (chambreId: string, participantId: string, type: 'eleve' | 'professeur') => {
    // Vérifier les permissions
    if (type === 'eleve') {
      // Un élève ne peut s'assigner que si auto_affectation_eleves est true
      if (isEleve && !voyageConfig.auto_affectation_eleves) {
        alert("L'auto-affectation n'est pas autorisée pour ce voyage");
        return;
      }
      // Un élève ne peut s'assigner que lui-même
      if (isEleve) {
        const participant = elevesDisponibles.find(p => p.id === participantId);
        if (!participant || participant.eleve_id !== currentUserEleveId) {
          alert("Vous ne pouvez vous inscrire que vous-même");
          return;
        }
      }
    }
    
    const table = type === 'eleve' ? 'chambre_affectations' : 'chambre_affectations_professeurs';
    
    const { error } = await supabase
      .from(table)
      .insert({
        chambre_id: chambreId,
        participant_id: participantId,
        created_by: localStorage.getItem('userId')
      });

    if (!error) {
      loadChambres();
      loadParticipantsDisponibles();
    }
  };

  const retirerParticipant = async (affectationId: string, type: 'eleve' | 'professeur', participantId?: string) => {
    // Vérifier les permissions
    if (type === 'eleve' && isEleve) {
      // Un élève ne peut se retirer que si auto_affectation_eleves est true
      if (!voyageConfig.auto_affectation_eleves) {
        alert("L'auto-affectation n'est pas autorisée pour ce voyage");
        return;
      }
      
      // Vérifier que l'affectation concerne bien l'élève connecté
      const affectation = affectations.find(a => a.id === affectationId);
      if (affectation?.participant.type === 'eleve' && 
          affectation.participant.eleve_id !== currentUserEleveId) {
        alert("Vous ne pouvez vous retirer que vous-même");
        return;
      }
    }
    
    const table = type === 'eleve' ? 'chambre_affectations' : 'chambre_affectations_professeurs';
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', affectationId);

    if (!error) {
      loadChambres();
      loadParticipantsDisponibles();
    }
  };

  // Vérifier si l'utilisateur courant est dans une chambre
  const getCurrentUserChambreId = (): string | null => {
    if (!isEleve || !currentUserEleveId) return null;
    
    const affectation = affectations.find(a => 
      a.participant_type === 'eleve' && 
      'eleve_id' in a.participant && 
      a.participant.eleve_id === currentUserEleveId
    );
    
    return affectation?.chambre_id || null;
  };

  const getElevesParGenre = (genre: string) => {
    return elevesDisponibles.filter(p => p.genre === genre);
  };

  const getGenreColor = (genre: string) => {
    switch (genre) {
      case 'M': return 'border-indigo-200 bg-indigo-50/50';
      case 'F': return 'border-amber-200 bg-amber-50/50';
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

  const getParticipantDisplay = (participant: Participant) => {
    if (participant.type === 'eleve') {
      return {
        nom: participant.eleve.nom,
        prenom: participant.eleve.prenom,
        detail: participant.classe,
        icone: '👤',
        estMoi: isEleve && participant.eleve_id === currentUserEleveId
      };
    } else {
      return {
        nom: participant.professeur.nom,
        prenom: participant.professeur.prenom,
        detail: participant.role === 'accompagnateur' ? '👥 Accompagnateur' : 
                participant.role === 'responsable' ? '⭐ Responsable' :
                participant.role === 'direction' ? '🏢 Direction' : '🏥 Infirmier',
        icone: '👨‍🏫',
        estMoi: false
      };
    }
  };

  if (loading) return <div className="text-center py-8">Chargement des chambres...</div>;

  const currentUserChambreId = getCurrentUserChambreId();

  return (
    <div className="space-y-4">
      {/* Header des chambres */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Plan des chambres</h3>
          <p className="text-xs text-gray-600">
            {chambres.length} chambre{chambres.length > 1 ? 's' : ''} • 
            {affectations.length} personne{affectations.length > 1 ? 's' : ''} affectée{affectations.length > 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Bouton ajouter chambre - uniquement pour les responsables */}
        {canEdit && (
          <button
            onClick={() => setShowAddChambre(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700"
          >
            + Ajouter
          </button>
        )}
      </div>

      {/* Message pour les élèves selon la configuration */}
      {isEleve && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
          <p className="text-xs text-blue-700">
            {voyageConfig.auto_affectation_eleves 
              ? "👋 Vous pouvez vous inscrire dans les chambres disponibles. Vous ne voyez que les chambres où vous êtes inscrit."
              : "👋 Les inscriptions ne sont pas ouvertes. Vous pouvez voir votre chambre mais pas en changer."}
          </p>
        </div>
      )}

      {/* Légende */}
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
        {chambres
          .filter(chambre => {
            // Filtrer les chambres pour les élèves si visibilite_restreinte_eleves est true
            if (isEleve && voyageConfig.visibilite_restreinte_eleves) {
              return chambre.id === currentUserChambreId;
            }
            return true;
          })
          .map((chambre) => {
          const affectationsChambre = getAffectationsForChambre(chambre.id);
          const placesLibres = chambre.capacite - affectationsChambre.length;
          const isComplete = placesLibres === 0;
          const estMaChambre = chambre.id === currentUserChambreId;
          
          // Participants disponibles selon le type de chambre
          const elevesPossibles = chambre.genre === 'M' ? getElevesParGenre('M') :
                                 chambre.genre === 'F' ? getElevesParGenre('F') :
                                 chambre.genre === 'mixte' ? elevesDisponibles : [];
          
          const professeursPossibles = chambre.genre === 'prof' ? professeursDisponibles : [];

          // Pour les élèves, ne montrer que les élèves de leur propre chambre
          const affectationsAffichees = (isEleve && voyageConfig.visibilite_restreinte_eleves && !estMaChambre) 
            ? [] 
            : affectationsChambre;

          return (
            <div
              key={chambre.id}
              className={`border rounded-lg p-3 ${getGenreColor(chambre.genre)} ${
                estMaChambre ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* En-tête chambre */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">
                      Ch. {chambre.numero_chambre}
                    </h4>
                    {chambre.nom_chambre && (
                      <span className="text-xs text-gray-600">• {chambre.nom_chambre}</span>
                    )}
                    {estMaChambre && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        Ma chambre
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bouton supprimer - uniquement pour les responsables */}
                {canEdit && (
                  <button
                    onClick={() => deleteChambre(chambre.id)}
                    className="text-gray-400 hover:text-red-600 text-xs"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Barre d'occupation */}
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

              {/* Liste des occupants */}
              <div className="space-y-1 mb-2 min-h-[60px] max-h-[120px] overflow-y-auto">
                {affectationsAffichees.map((aff) => {
                  const display = getParticipantDisplay(aff.participant);
                  return (
                    <div
                      key={aff.id}
                      className={`flex justify-between items-center py-1 px-1.5 bg-white bg-opacity-50 rounded text-xs ${
                        display.estMoi ? 'bg-blue-100 font-medium' : ''
                      }`}
                    >
                      <span className="font-medium truncate max-w-[120px]">
                        {display.icone} {display.prenom} {display.nom}.
                        {display.estMoi && ' (moi)'}
                      </span>
                      <span className="text-xs text-gray-500 ml-1 truncate max-w-[60px]">
                        {display.detail}
                      </span>
                      
                      {/* Bouton retirer - pour les responsables OU pour l'élève lui-même si auto-affectation */}
                      {(canEdit || (isEleve && display.estMoi && voyageConfig.auto_affectation_eleves)) && (
                        <button
                          onClick={() => retirerParticipant(aff.id, aff.participant_type, 
                            aff.participant.type === 'eleve' ? aff.participant.eleve_id.toString() : undefined
                          )}
                          className="text-red-600 hover:text-red-800 text-xs ml-auto"
                          title="Retirer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
                {affectationsAffichees.length === 0 && (
                  <div className="text-center py-2 text-gray-400 text-xs">
                    {isEleve && !estMaChambre ? 'Chambre privée' : 'Vide'}
                  </div>
                )}
              </div>

              {/* Ajout d'élèves ou professeurs */}
              {!isComplete && (
                <div className="space-y-1">
                  {/* Pour les responsables : peuvent ajouter n'importe qui */}
                  {canEdit && (
                    <>
                      {elevesPossibles.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              assignerParticipant(chambre.id, e.target.value, 'eleve');
                              e.target.value = '';
                            }
                          }}
                          value=""
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">+ Ajouter élève...</option>
                          {elevesPossibles.map((p) => (
                            <option key={p.id} value={p.id}>
                              👤 {p.eleve.prenom} {p.eleve.nom}. - {p.classe}
                            </option>
                          ))}
                        </select>
                      )}

                      {professeursPossibles.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              assignerParticipant(chambre.id, e.target.value, 'professeur');
                              e.target.value = '';
                            }
                          }}
                          value=""
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">+ Ajouter professeur...</option>
                          {professeursPossibles.map((p) => (
                            <option key={p.id} value={p.id}>
                              👨‍🏫 {p.professeur.prenom} {p.professeur.nom}. - {p.role}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}

                  {/* Pour les élèves : peuvent s'ajouter eux-mêmes si autorisé */}
                  {isEleve && voyageConfig.auto_affectation_eleves && !estMaChambre && (
                    <>
                      {elevesDisponibles
                        .filter(p => p.eleve_id === currentUserEleveId)
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => assignerParticipant(chambre.id, p.id, 'eleve')}
                            className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            + M'inscrire dans cette chambre
                          </button>
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal ajout chambre - uniquement pour les responsables */}
      {canEdit && showAddChambre && (
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
