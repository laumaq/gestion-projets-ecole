//components/voyages/PrisePresences.tsx

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
}

interface Affectation {
  id: string;
  chambre_id: string;
  participant_id: string;
  participant_type: 'eleve' | 'professeur';
  participant: any;
}

interface Presence {
  id: string;
  affectation_id: string;
  present: boolean;
}

export default function PrisePresences({ configId, voyageId, isResponsable, userType }: Props) {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [presences, setPresences] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [datePresence, setDatePresence] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isEmployee = userType === 'employee';
  const canReset = isEmployee && isResponsable;

  useEffect(() => {
    const id = localStorage.getItem('userId');
    setCurrentUserId(id);
    
    if (isEmployee) {
      loadChambres();
    }
  }, [configId, datePresence]);

  const loadChambres = async () => {
    const { data: chambresData } = await supabase
      .from('chambres')
      .select('*')
      .eq('hebergement_config_id', configId)
      .order('numero_chambre');

    if (chambresData) {
      setChambres(chambresData);
      await loadAffectations(chambresData.map(c => c.id));
    }
  };

  const loadAffectations = async (chambreIds: string[]) => {
    if (chambreIds.length === 0) {
      setLoading(false);
      return;
    }

    // Charger les affectations des élèves
    const { data: elevesData } = await supabase
      .from('chambre_affectations')
      .select(`
        id,
        chambre_id,
        participant_id,
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

    // Charger les affectations des professeurs
    const { data: professeursData } = await supabase
      .from('chambre_affectations_professeurs')
      .select(`
        id,
        chambre_id,
        participant_id,
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
        participant: Array.isArray(item.participant.eleve) 
          ? item.participant.eleve[0] 
          : item.participant.eleve
      }));
      toutesAffectations = [...toutesAffectations, ...elevesFormates];
    }

    if (professeursData) {
      const professeursFormates = professeursData.map((item: any) => ({
        id: item.id,
        chambre_id: item.chambre_id,
        participant_id: item.participant_id,
        participant_type: 'professeur' as const,
        participant: Array.isArray(item.participant.professeur) 
          ? item.participant.professeur[0] 
          : item.participant.professeur
      }));
      toutesAffectations = [...toutesAffectations, ...professeursFormates];
    }

    setAffectations(toutesAffectations);
    await loadPresences(toutesAffectations.map(a => a.id));
    setLoading(false);
  };

  const loadPresences = async (affectationIds: string[]) => {
    if (affectationIds.length === 0) return;

    const { data } = await supabase
      .from('chambre_presences')
      .select('affectation_id, present')
      .eq('config_id', configId)
      .eq('date_presence', datePresence)
      .in('affectation_id', affectationIds);

    const presenceMap = new Map();
    
    // Par défaut, toutes les présences sont à false (X)
    affectationIds.forEach(id => presenceMap.set(id, false));
    
    // Mettre à jour avec les présences existantes
    if (data) {
      data.forEach(p => presenceMap.set(p.affectation_id, p.present));
    }
    
    setPresences(presenceMap);
  };

  const togglePresence = async (affectationId: string) => {
    if (!isEmployee) return;

    const nouvelleValeur = !(presences.get(affectationId) || false);
    
    // Mise à jour optimiste
    setPresences(new Map(presences).set(affectationId, nouvelleValeur));

    // Sauvegarde en base
    const { error } = await supabase
      .from('chambre_presences')
      .upsert({
        affectation_id: affectationId,
        chambre_id: chambres.find(c => 
          affectations.find(a => a.id === affectationId)?.chambre_id === c.id
        )?.id,
        config_id: configId,
        voyage_id: voyageId,
        participant_id: affectations.find(a => a.id === affectationId)?.participant_id,
        participant_type: affectations.find(a => a.id === affectationId)?.participant_type,
        present: nouvelleValeur,
        date_presence: datePresence,
        created_by: currentUserId
      }, {
        onConflict: 'affectation_id, date_presence'
      });

    if (error) {
      // En cas d'erreur, on annule la mise à jour optimiste
      setPresences(new Map(presences).set(affectationId, !nouvelleValeur));
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const resetAllPresences = async () => {
    if (!canReset) return;
    
    if (confirm('Remettre toutes les présences à "absent" (X) pour cette configuration ?')) {
      setSaving(true);
      
      const presenceMap = new Map(presences);
      affectations.forEach(a => presenceMap.set(a.id, false));
      setPresences(presenceMap);

      // Mettre à jour toutes les présences à false
      const { error } = await supabase
        .from('chambre_presences')
        .upsert(
          affectations.map(a => ({
            affectation_id: a.id,
            chambre_id: a.chambre_id,
            config_id: configId,
            voyage_id: voyageId,
            participant_id: a.participant_id,
            participant_type: a.participant_type,
            present: false,
            date_presence: datePresence,
            created_by: currentUserId
          })),
          { onConflict: 'affectation_id, date_presence' }
        );

      if (error) {
        console.error('Erreur lors du reset:', error);
        // Recharger les données en cas d'erreur
        await loadPresences(affectations.map(a => a.id));
      }
      
      setSaving(false);
    }
  };

  const getAffectationsForChambre = (chambreId: string) => {
    return affectations.filter(a => a.chambre_id === chambreId);
  };

  const getParticipantName = (aff: Affectation) => {
    if (aff.participant_type === 'eleve') {
      return `${aff.participant?.prenom || ''} ${aff.participant?.nom || ''}.`;
    } else {
      return `${aff.participant?.prenom || ''} ${aff.participant?.nom || ''}.`;
    }
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

  if (!isEmployee) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès réservé au personnel
        </h3>
        <p className="text-gray-600">
          Seuls les employés peuvent prendre les présences.
        </p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  const totalPersonnes = affectations.length;
  const presentes = Array.from(presences.values()).filter(v => v).length;

  return (
    <div className="space-y-4">
      {/* Header avec sélecteur de date et statistiques */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Prise des présences</h3>
          <p className="text-xs text-gray-600">
            {totalPersonnes} personne{totalPersonnes > 1 ? 's' : ''} • 
            {presentes} présent{presentes > 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={datePresence}
            onChange={(e) => setDatePresence(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          />
          
          {canReset && (
            <button
              onClick={resetAllPresences}
              disabled={saving}
              className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Reset...' : 'Reset tous (X)'}
            </button>
          )}
        </div>
      </div>

      {/* Message d'info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          👋 Cliquez sur les cases pour marquer les présences : 
          <span className="inline-flex items-center mx-2">
            <span className="w-5 h-5 bg-red-100 border border-red-300 rounded flex items-center justify-center text-red-700">✕</span>
            <span className="ml-1">absent</span>
          </span>
          <span className="inline-flex items-center">
            <span className="w-5 h-5 bg-green-100 border border-green-300 rounded flex items-center justify-center text-green-700">✓</span>
            <span className="ml-1">présent</span>
          </span>
        </p>
      </div>

      {/* Grille des chambres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {chambres.map((chambre) => {
          const affectationsChambre = getAffectationsForChambre(chambre.id);
          
          if (affectationsChambre.length === 0) return null;

          return (
            <div
              key={chambre.id}
              className={`border rounded-lg p-3 ${getGenreColor(chambre.genre)}`}
            >
              {/* En-tête chambre */}
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">
                    Ch. {chambre.numero_chambre}
                  </h4>
                  {chambre.nom_chambre && (
                    <span className="text-xs text-gray-600">• {chambre.nom_chambre}</span>
                  )}
                </div>
              </div>

              {/* Liste des occupants avec boutons de présence */}
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {affectationsChambre.map((aff) => {
                  const estPresent = presences.get(aff.id) || false;
                  
                  return (
                    <div
                      key={aff.id}
                      className="flex justify-between items-center py-1 px-1.5 bg-white bg-opacity-50 rounded"
                    >
                      <span className="text-xs">
                        {aff.participant_type === 'eleve' ? '👤' : '👨‍🏫'} 
                        {getParticipantName(aff)}
                      </span>
                      
                      <button
                        onClick={() => togglePresence(aff.id)}
                        className={`w-6 h-6 rounded border flex items-center justify-center text-xs font-medium transition-colors ${
                          estPresent
                            ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {estPresent ? '✓' : '✕'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Statistiques de la chambre */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Présents:</span>
                  <span className="font-medium">
                    {affectationsChambre.filter(a => presences.get(a.id)).length}/{affectationsChambre.length}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message si aucune chambre avec occupants */}
      {chambres.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🛏️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune chambre configurée
          </h3>
          <p className="text-gray-600">
            Créez d'abord des chambres dans l'onglet "Plan des chambres"
          </p>
        </div>
      )}

      {chambres.length > 0 && affectations.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune personne dans les chambres
          </h3>
          <p className="text-gray-600">
            Affectez d'abord des personnes dans l'onglet "Plan des chambres"
          </p>
        </div>
      )}
    </div>
  );
}
