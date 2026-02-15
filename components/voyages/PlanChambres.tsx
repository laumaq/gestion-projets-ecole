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

export default function PlanChambres({ configId, voyageId, isResponsable, userType }: Props) {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<EleveParticipant[]>([]);
  const [professeursDisponibles, setProfesseursDisponibles] = useState<ProfesseurParticipant[]>([]);
  const [professeursParticipants, setProfesseursParticipants] = useState<ProfesseurParticipant[]>([]);
  const [showAddChambre, setShowAddChambre] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEleveId, setCurrentUserEleveId] = useState<number | null>(null);
  const [currentUserGenre, setCurrentUserGenre] = useState<string | null>(null);
  const [autoAffectation, setAutoAffectation] = useState(false);

  const canEdit = userType === 'employee' && isResponsable;
  const isEmployee = userType === 'employee';
  const isEleve = userType === 'student';

  useEffect(() => {
    const id = localStorage.getItem('userId');
    setCurrentUserId(id);
    
    if (isEleve && id) {
      setCurrentUserEleveId(parseInt(id));
      loadCurrentUserGenre(parseInt(id));
    }
    
    loadVoyageConfig();
    loadChambres();
    loadParticipantsDisponibles();
    loadProfesseursParticipants();
  }, [configId]);

  const loadCurrentUserGenre = async (eleveId: number) => {
    const { data } = await supabase
      .from('students')
      .select('sexe')
      .eq('matricule', eleveId)
      .single();
    
    if (data) {
      setCurrentUserGenre(data.sexe);
    }
  };

  const loadVoyageConfig = async () => {
    const { data } = await supabase
      .from('voyages')
      .select('auto_affectation_eleves')
      .eq('id', voyageId)
      .single();

    if (data) {
      setAutoAffectation(data.auto_affectation_eleves);
    }
  };

  const loadProfesseursParticipants = async () => {
    const { data } = await supabase
      .from('voyage_professeurs')
      .select(`
        id,
        professeur_id,
        role,
        professeur:employees!inner (
          id,
          nom,
          prenom,
          email,
          initiale
        )
      `)
      .eq('voyage_id', voyageId);

    if (data) {
      const professeursFormates = data.map((item: any) => ({
        id: item.id,
        professeur_id: item.professeur_id,
        role: item.role,
        type: 'professeur' as const,
        professeur: Array.isArray(item.professeur) ? item.professeur[0] : item.professeur
      }));
      setProfesseursParticipants(professeursFormates);
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
  
    const { data: elevesData } = await supabase
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
  
    const { data: professeursData } = await supabase
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

    if (elevesData) {
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

    if (professeursData) {
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

    const elevesAffectesIds = affectesEleves?.map(a => a.participant_id) || [];

    const { data: elevesData } = await supabase
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

    if (elevesData) {
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
  };

  const addChambre = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await supabase
      .from('chambres')
      .insert({
        hebergement_config_id: configId,
        numero_chambre: formData.get('numero'),
        nom_chambre: formData.get('nom') || null,
        capacite: parseInt(formData.get('capacite') as string),
        genre: formData.get('genre'),
        notes: formData.get('notes') || null
      });

    loadChambres();
    setShowAddChambre(false);
  };

  const deleteChambre = async (chambreId: string) => {
    if (!canEdit) return;
    if (confirm('Supprimer cette chambre ?')) {
      await supabase.from('chambres').delete().eq('id', chambreId);
      loadChambres();
    }
  };

  const inscrireEleve = async (chambreId: string) => {
    if (!currentUserEleveId || !autoAffectation) return;

    const participant = elevesDisponibles.find(e => e.eleve_id === currentUserEleveId);
    if (!participant) return;

    await supabase
      .from('chambre_affectations')
      .insert({
        chambre_id: chambreId,
        participant_id: participant.id,
        created_by: currentUserId
      });

    loadChambres();
    loadParticipantsDisponibles();
  };

  const assignerParticipant = async (chambreId: string, participantId: string, type: 'eleve' | 'professeur') => {
    if (!isEmployee) return;
    
    const table = type === 'eleve' ? 'chambre_affectations' : 'chambre_affectations_professeurs';
    
    await supabase
      .from(table)
      .insert({
        chambre_id: chambreId,
        participant_id: participantId,
        created_by: currentUserId
      });

    loadChambres();
    loadParticipantsDisponibles();
  };

  const retirerParticipant = async (affectationId: string, type: 'eleve' | 'professeur', participantId?: string) => {
    // Permettre aux élèves de se retirer eux-mêmes si autoAffectation est true
    if (isEleve) {
      if (!autoAffectation) return;
      
      // Vérifier que l'élève retire bien sa propre affectation
      const affectation = affectations.find(a => a.id === affectationId);
      if (!affectation || 
          affectation.participant_type !== 'eleve' || 
          !('eleve_id' in affectation.participant) ||
          affectation.participant.eleve_id !== currentUserEleveId) {
        return;
      }
    } else if (isEmployee && !canEdit) {
      // Employé non-responsable : ne peut retirer que lui-même
      const affectation = affectations.find(a => a.id === affectationId);
      if (!affectation || 
          affectation.participant_type !== 'professeur' || 
          !('professeur_id' in affectation.participant) ||
          affectation.participant.professeur_id !== currentUserId) {
        return;
      }
    } else if (!canEdit) {
      return; // Ni élève, ni employé responsable → bloqué
    }
    
    const table = type === 'eleve' ? 'chambre_affectations' : 'chambre_affectations_professeurs';
    
    await supabase
      .from(table)
      .delete()
      .eq('id', affectationId);
  
    loadChambres();
    loadParticipantsDisponibles();
  };

  const getAffectationsForChambre = (chambreId: string) => {
    return affectations.filter(a => a.chambre_id === chambreId);
  };

  const getElevesParGenre = (genre: string) => {
    return elevesDisponibles.filter(p => p.genre === genre);
  };

  const getProfesseursDisponibles = () => {
    const professeursAffectesIds = affectations
      .filter(a => a.participant_type === 'professeur')
      .map(a => a.participant_id);
    
    return professeursParticipants.filter(p => !professeursAffectesIds.includes(p.id));
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

  const getParticipantName = (aff: Affectation) => {
    if (aff.participant_type === 'eleve') {
      const p = aff.participant as any;
      return `${p.eleve?.prenom || ''} ${p.eleve?.nom || ''}.`;
    } else {
      const p = aff.participant as any;
      return `${p.professeur?.prenom || ''} ${p.professeur?.nom || ''}.`;
    }
  };

  // Trouver la chambre où l'élève est actuellement
  const getMaChambre = (): { chambre: Chambre; affectation: Affectation } | null => {
    if (!isEleve || !currentUserEleveId) return null;
    
    for (const chambre of chambres) {
      const affectationsChambre = getAffectationsForChambre(chambre.id);
      const monAffectation = affectationsChambre.find(a => 
        a.participant_type === 'eleve' && 
        'eleve_id' in a.participant && 
        a.participant.eleve_id === currentUserEleveId
      );
      if (monAffectation) {
        return { chambre, affectation: monAffectation };
      }
    }
    return null;
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  const maChambre = getMaChambre();
  const professeursDispos = getProfesseursDisponibles();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Plan des chambres</h3>
          <p className="text-xs text-gray-600">
            {chambres.length} chambre{chambres.length > 1 ? 's' : ''} • 
            {affectations.length} personne{affectations.length > 1 ? 's' : ''} affectée{affectations.length > 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Ajout de chambre - uniquement pour les responsables */}
        {canEdit && (
          <button
            onClick={() => setShowAddChambre(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700"
          >
            + Ajouter une chambre
          </button>
        )}
      </div>

      {/* Message pour les élèves */}
      {isEleve && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            {autoAffectation 
              ? "👋 Vous pouvez choisir une chambre libre. Une fois inscrit, vous verrez vos camarades de chambre."
              : "👋 Les inscriptions ne sont pas ouvertes pour le moment."}
          </p>
        </div>
      )}

      {/* Message pour les employés non-responsables */}
      {isEmployee && !canEdit && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-xs text-purple-700">
            👋 Vous pouvez voir toutes les chambres et vous inscrire si vous le souhaitez.
          </p>
        </div>
      )}

      {/* Grille des chambres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {chambres.map((chambre) => {
          const affectationsChambre = getAffectationsForChambre(chambre.id);
          const placesLibres = chambre.capacite - affectationsChambre.length;
          const estComplete = placesLibres === 0;
          
          // Pour les élèves : ne voir que les chambres de leur genre, pas complètes
          const estChambrePourMoi = isEleve && 
            (chambre.genre === currentUserGenre || chambre.genre === 'mixte') && 
            !estComplete;

          // Est-ce que l'élève est dans cette chambre ?
          const jeSuisDansCetteChambre = maChambre?.chambre.id === chambre.id;

          return (
            <div
              key={chambre.id}
              className={`border rounded-lg p-3 ${getGenreColor(chambre.genre)} ${
                jeSuisDansCetteChambre ? 'ring-2 ring-green-500' : ''
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
                    {jeSuisDansCetteChambre && (
                      <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                        Ma chambre
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bouton supprimer - UNIQUEMENT pour les responsables */}
                {canEdit && (
                  <button
                    onClick={() => deleteChambre(chambre.id)}
                    className="text-gray-400 hover:text-red-600 text-xs"
                    title="Supprimer la chambre"
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

              {/* Liste des occupants - visible pour les employés OU si l'élève est dans la chambre */}
              {(isEmployee || jeSuisDansCetteChambre) && (
                <div className="space-y-1 mb-2 min-h-[60px] max-h-[120px] overflow-y-auto">
                  {affectationsChambre.map((aff) => {
                    const estMoi = aff.participant_type === 'eleve' && 
                      'eleve_id' in aff.participant && 
                      aff.participant.eleve_id === currentUserEleveId;
                    
                    const estMoiEmploye = aff.participant_type === 'professeur' && 
                      'professeur_id' in aff.participant && 
                      aff.participant.professeur_id === currentUserId;
                    
                    return (
                      <div
                        key={aff.id}
                        className={`flex justify-between items-center py-1 px-1.5 bg-white bg-opacity-50 rounded text-xs ${
                          estMoi || estMoiEmploye ? 'bg-green-100 font-medium' : ''
                        }`}
                      >
                        <span>
                          {aff.participant_type === 'eleve' ? '👤' : '👨‍🏫'} 
                          {getParticipantName(aff)}
                          {(estMoi || estMoiEmploye) && ' (moi)'}
                        </span>
                        
                        {/* Bouton de désinscription pour l'élève lui-même */}
                        {isEleve && estMoi && autoAffectation && (
                          <button
                            onClick={() => retirerParticipant(aff.id, aff.participant_type, 
                              aff.participant_type === 'eleve' ? (aff.participant as any).eleve_id : undefined
                            )}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Quitter
                          </button>
                        )}
                        
                        {/* Bouton de désinscription pour l'employé non-responsable (lui-même) */}
                        {isEmployee && !canEdit && estMoiEmploye && (
                          <button
                            onClick={() => retirerParticipant(aff.id, aff.participant_type)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Quitter
                          </button>
                        )}
                        
                        {/* Bouton de retrait pour les responsables (peuvent retirer n'importe qui) */}
                        {canEdit && (
                          <button
                            onClick={() => retirerParticipant(aff.id, aff.participant_type)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {affectationsChambre.length === 0 && (
                    <div className="text-center py-2 text-gray-400 text-xs">
                      Vide
                    </div>
                  )}
                </div>
              )}

              {/* Pour les élèves sans chambre : bouton d'inscription */}
              {isEleve && !maChambre && estChambrePourMoi && autoAffectation && (
                <button
                  onClick={() => inscrireEleve(chambre.id)}
                  className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  M'inscrire dans cette chambre
                </button>
              )}

              {/* Pour les employés non-responsables : s'inscrire dans les chambres de profs/mixte */}
              {isEmployee && !canEdit && !jeSuisDansCetteChambre && !estComplete && 
               (chambre.genre === 'prof' || chambre.genre === 'mixte') && (
                
                // Trouver si l'employé est déjà dans le voyage
                professeursParticipants
                  .filter(p => p.professeur_id === currentUserId)
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => assignerParticipant(chambre.id, p.id, 'professeur')}
                      className="w-full px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      M'inscrire dans cette chambre
                    </button>
                  ))
              )}

              {/* Pour les responsables : ajout d'élèves/professeurs */}
              {canEdit && !estComplete && (
                <div className="space-y-1">
                  {/* Ajout d'élèves */}
                  {getElevesParGenre(chambre.genre).length > 0 && (
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
                      {getElevesParGenre(chambre.genre).map((p) => (
                        <option key={p.id} value={p.id}>
                          👤 {p.eleve.prenom} {p.eleve.nom}. - {p.classe}
                        </option>
                      ))}
                    </select>
                  )}
              
                  {/* Ajout de professeurs pour les chambres prof ou mixte */}
                  {(chambre.genre === 'prof' || chambre.genre === 'mixte') && professeursDispos.length > 0 && (
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
                      {professeursDispos.map((p) => (
                        <option key={p.id} value={p.id}>
                          👨‍🏫 {p.professeur.prenom} {p.professeur.nom}. - {p.role}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal ajout chambre - pour les responsables uniquement */}
      {canEdit && showAddChambre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Ajouter une chambre</h3>
            <form onSubmit={addChambre} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Numéro</label>
                <input name="numero" type="text" required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom (optionnel)</label>
                <input name="nom" type="text" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacité</label>
                <input name="capacite" type="number" min="1" max="8" required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Genre</label>
                <select name="genre" required className="w-full px-3 py-2 border rounded-lg">
                  <option value="M">Garçons</option>
                  <option value="F">Filles</option>
                  <option value="prof">Professeurs</option>
                  <option value="mixte">Mixte</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddChambre(false)} className="px-4 py-2 border rounded-lg">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
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
