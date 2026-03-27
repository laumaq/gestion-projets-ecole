//components/activites/VueElevePlanning.tsx
// 

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO, isSameDay, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  voyageId: string;
  eleveId: number;
  userType: 'student';
}

interface Jour {
  id: string;
  date: string;
  groupes: Groupe[];
}

interface Groupe {
  id: string;
  nom: string;
  nb_inscriptions_max: number;
  activites: Activite[];
  inscriptions_eleve: string[]; // IDs des activités où l'élève est inscrit
}

interface Activite {
  id: string;
  titre: string;
  description: string;
  heure_debut: string;
  heure_fin: string;
  jauge: number | null;
  avec_inscription: boolean;
  est_obligatoire: boolean;
  nb_inscrits: number;
}

export default function VueElevePlanning({ voyageId, eleveId, userType }: Props) {
  const [jours, setJours] = useState<Jour[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJour, setExpandedJour] = useState<string | null>(null);
  const [expandedGroupe, setExpandedGroupe] = useState<string | null>(null);
  const [inscriptions, setInscriptions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlanning();
  }, [voyageId]);

  const loadPlanning = async () => {
    // Charger les jours
    const { data: joursData } = await supabase
      .from('planning_jours')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date');

    if (!joursData) {
      setLoading(false);
      return;
    }

    // Charger les inscriptions de l'élève
    const { data: inscriptionsData } = await supabase
      .from('inscriptions_eleves')
      .select('activite_id')
      .eq('eleve_id', eleveId);

    const inscriptionsSet = new Set(inscriptionsData?.map(i => i.activite_id) || []);
    setInscriptions(inscriptionsSet);

    // Pour chaque jour, charger groupes et activités
    const joursComplets = await Promise.all(
      joursData.map(async (jour) => {
        const { data: groupesData } = await supabase
          .from('groupes_activites')
          .select('*')
          .eq('planning_jour_id', jour.id)
          .order('ordre');

        const groupesComplets = await Promise.all(
          (groupesData || []).map(async (groupe) => {
            // Charger les activités du groupe
            const { data: activitesData } = await supabase
              .from('activites')
              .select('*')
              .eq('groupe_id', groupe.id)
              .order('heure_debut');

            // Pour chaque activité, compter les inscriptions
            const activitesAvecCompteurs = await Promise.all(
              (activitesData || []).map(async (activite) => {
                const { count } = await supabase
                  .from('inscriptions_eleves')
                  .select('*', { count: 'exact', head: true })
                  .eq('activite_id', activite.id);

                return {
                  ...activite,
                  nb_inscrits: count || 0
                };
              })
            );

            return {
              ...groupe,
              activites: activitesAvecCompteurs,
              inscriptions_eleve: activitesAvecCompteurs
                .filter(a => inscriptionsSet.has(a.id))
                .map(a => a.id)
            };
          })
        );

        return {
          id: jour.id,
          date: jour.date,
          groupes: groupesComplets
        };
      })
    );

    setJours(joursComplets);
    setLoading(false);
  };

  // Vérifier si deux activités se chevauchent
  const verifierChevauchement = (activite1: Activite, activite2: Activite): boolean => {
    const debut1 = activite1.heure_debut;
    const fin1 = activite1.heure_fin;
    const debut2 = activite2.heure_debut;
    const fin2 = activite2.heure_fin;
    
    return (debut1 < fin2 && debut2 < fin1);
  };

  // Vérifier si une activité est en conflit avec les inscriptions existantes
  const aConflit = (activite: Activite, activitesInscrites: Activite[]): boolean => {
    return activitesInscrites.some(inscrite => verifierChevauchement(activite, inscrite));
  };

  // Vérifier si l'élève peut s'inscrire à une activité
  const peutSInscrire = (activite: Activite, groupe: Groupe, activitesInscrites: Activite[]): { peut: boolean; raison: string } => {
    // Activité obligatoire : pas d'inscription manuelle
    if (activite.est_obligatoire) {
      return { peut: false, raison: 'Activité obligatoire (pas d\'inscription)' };
    }

    // Déjà inscrit
    if (inscriptions.has(activite.id)) {
      return { peut: false, raison: 'Déjà inscrit' };
    }

    // Jauge pleine
    if (activite.jauge && activite.nb_inscrits >= activite.jauge) {
      return { peut: false, raison: 'Complet' };
    }

    // Conflit horaire
    if (aConflit(activite, activitesInscrites)) {
      return { peut: false, raison: 'Conflit d\'horaire' };
    }

    // Nombre max d'inscriptions dans le groupe
    const inscriptionsDansGroupe = activitesInscrites.filter(a => 
      groupe.activites.some(gA => gA.id === a.id)
    ).length;
    
    if (inscriptionsDansGroupe >= groupe.nb_inscriptions_max) {
      return { peut: false, raison: `Maximum ${groupe.nb_inscriptions_max} activité(s) dans ce groupe` };
    }

    return { peut: true, raison: '' };
  };

  const inscrire = async (activite: Activite, groupe: Groupe) => {
    if (saving) return;
    
    const activitesInscrites = jours
      .flatMap(j => j.groupes)
      .flatMap(g => g.activites)
      .filter(a => inscriptions.has(a.id));

    const verification = peutSInscrire(activite, groupe, activitesInscrites);
    if (!verification.peut) {
      alert(verification.raison);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('inscriptions_eleves')
      .insert({
        activite_id: activite.id,
        eleve_id: eleveId
      });

    if (!error) {
      setInscriptions(new Set(inscriptions).add(activite.id));
      loadPlanning(); // Recharger pour mettre à jour les compteurs
    } else {
      alert('Erreur lors de l\'inscription');
    }
    setSaving(false);
  };

  const desinscrire = async (activite: Activite) => {
    if (saving) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('inscriptions_eleves')
      .delete()
      .eq('activite_id', activite.id)
      .eq('eleve_id', eleveId);

    if (!error) {
      const newInscriptions = new Set(inscriptions);
      newInscriptions.delete(activite.id);
      setInscriptions(newInscriptions);
      loadPlanning();
    } else {
      alert('Erreur lors de la désinscription');
    }
    setSaving(false);
  };

  const activitesInscrites = useMemo(() => {
    return jours
      .flatMap(j => j.groupes)
      .flatMap(g => g.activites)
      .filter(a => inscriptions.has(a.id));
  }, [jours, inscriptions]);

  if (loading) return <div className="text-center py-8">Chargement du planning...</div>;

  if (jours.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun planning défini</h3>
        <p className="text-gray-600">Les organisateurs n'ont pas encore créé le planning du voyage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec résumé */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📅 Mon planning</h2>
            <p className="text-sm text-gray-600">
              {activitesInscrites.length} activité{activitesInscrites.length > 1 ? 's' : ''} inscrite{activitesInscrites.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {jours.length} jour{jours.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Liste des jours */}
      {jours.map((jour) => {
        const estExpanded = expandedJour === jour.id;
        const dateObj = parseISO(jour.date);
        const jourSemaine = format(dateObj, 'EEEE', { locale: fr });
        const dateStr = format(dateObj, 'dd MMMM yyyy', { locale: fr });
        
        return (
          <div key={jour.id} className="bg-white rounded-lg border overflow-hidden">
            {/* En-tête du jour - cliquable pour plier/déplier */}
            <button
              onClick={() => setExpandedJour(estExpanded ? null : jour.id)}
              className="w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition flex justify-between items-center"
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 capitalize">{jourSemaine}</span>
                  <span className="text-sm text-gray-500">{dateStr}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {jour.groupes.reduce((acc, g) => acc + g.activites.length, 0)} activité{jour.groupes.reduce((acc, g) => acc + g.activites.length, 0) > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-gray-400">
                {estExpanded ? '▲' : '▼'}
              </div>
            </button>

            {/* Contenu du jour - visible si déplié */}
            {estExpanded && (
              <div className="p-4 space-y-4">
                {jour.groupes.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Aucune activité prévue ce jour</p>
                ) : (
                  jour.groupes.map((groupe) => {
                    const estGroupeExpanded = expandedGroupe === groupe.id;
                    const activitesAvecInscriptions = groupe.activites.filter(a => inscriptions.has(a.id));
                    const inscriptionsPossibles = groupe.nb_inscriptions_max - activitesAvecInscriptions.length;
                    
                    return (
                      <div key={groupe.id} className="border rounded-lg overflow-hidden">
                        {/* En-tête du groupe */}
                        <button
                          onClick={() => setExpandedGroupe(estGroupeExpanded ? null : groupe.id)}
                          className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 transition flex justify-between items-center"
                        >
                          <div>
                            <h3 className="font-medium text-gray-900">{groupe.nom}</h3>
                            <p className="text-xs text-gray-600">
                              {inscriptionsPossibles > 0 
                                ? `Encore ${inscriptionsPossibles} inscription${inscriptionsPossibles > 1 ? 's' : ''} possible${inscriptionsPossibles > 1 ? 's' : ''}`
                                : 'Nombre max d\'inscriptions atteint'}
                            </p>
                          </div>
                          <div className="text-gray-500 text-sm">
                            {activitesAvecInscriptions.length}/{groupe.nb_inscriptions_max}
                            <span className="ml-2">{estGroupeExpanded ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {/* Liste des activités du groupe */}
                        {estGroupeExpanded && (
                          <div className="p-3 space-y-2">
                            {groupe.activites.map((activite) => {
                              const estInscrit = inscriptions.has(activite.id);
                              const activitesInscritesDansGroupe = groupe.activites.filter(a => inscriptions.has(a.id));
                              const verification = peutSInscrire(activite, groupe, activitesInscritesDansGroupe);
                              const estComplet = activite.jauge && activite.nb_inscrits >= activite.jauge;
                              const estEnConflit = aConflit(activite, activitesInscrites);
                              
                              return (
                                <div
                                  key={activite.id}
                                  className={`border rounded-lg p-3 transition ${
                                    estEnConflit && estInscrit ? 'border-red-300 bg-red-50' : 'hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium text-gray-900">{activite.titre}</h4>
                                        <span className="text-xs text-gray-500">
                                          ⏰ {activite.heure_debut.slice(0, 5)} - {activite.heure_fin.slice(0, 5)}
                                        </span>
                                        {activite.est_obligatoire && (
                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Obligatoire</span>
                                        )}
                                        {estComplet && (
                                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Complet</span>
                                        )}
                                        {estEnConflit && estInscrit && (
                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">⚠️ Conflit horaire</span>
                                        )}
                                      </div>
                                      {activite.description && (
                                        <p className="text-xs text-gray-500 mt-1">{activite.description}</p>
                                      )}
                                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                        {activite.jauge && (
                                          <span>🎫 {activite.nb_inscrits}/{activite.jauge} places</span>
                                        )}
                                        {!activite.avec_inscription && (
                                          <span>🔓 Sans inscription</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Bouton d'inscription/désinscription */}
                                    {!activite.est_obligatoire && activite.avec_inscription && (
                                      <div className="ml-3">
                                        {estInscrit ? (
                                          <button
                                            onClick={() => desinscrire(activite)}
                                            disabled={saving}
                                            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                          >
                                            Se désinscrire
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => inscrire(activite, groupe)}
                                            disabled={saving || !verification.peut}
                                            className={`px-3 py-1.5 text-sm rounded-lg ${
                                              verification.peut
                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            } disabled:opacity-50`}
                                            title={!verification.peut ? verification.raison : ''}
                                          >
                                            S'inscrire
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}