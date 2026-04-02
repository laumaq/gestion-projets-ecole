//components/activites/GestionPlanning.tsx


'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  voyageId: string;
  isResponsable: boolean;
}

interface Jour {
  id: string;
  date: string;
  ordre: number;
  groupes?: Groupe[];
}

interface Groupe {
  id: string;
  nom: string;
  description?: string;
  nb_inscriptions_max: number;
  ordre: number;
  activites?: Activite[];
}

interface Activite {
  id: string;
  titre: string;
  description?: string;
  heure_debut: string;
  heure_fin: string;
  jauge?: number;
  avec_inscription: boolean;
  est_obligatoire: boolean;
}

export default function GestionPlanning({ voyageId, isResponsable }: Props) {
  const [jours, setJours] = useState<Jour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJour, setShowNewJour] = useState(false);
  const [showNewGroupe, setShowNewGroupe] = useState<string | null>(null);
  const [showNewActivite, setShowNewActivite] = useState<string | null>(null);

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

    if (joursData) {
      // Pour chaque jour, charger ses groupes
      const joursAvecGroupes = await Promise.all(
        joursData.map(async (jour) => {
          const { data: groupesData } = await supabase
            .from('groupes_activites')
            .select('*')
            .eq('planning_jour_id', jour.id)
            .order('ordre');

          // Pour chaque groupe, charger ses activités
          const groupesAvecActivites = await Promise.all(
            (groupesData || []).map(async (groupe) => {
              const { data: activitesData } = await supabase
                .from('activites')
                .select('*')
                .eq('groupe_id', groupe.id)
                .order('heure_debut');

              return { ...groupe, activites: activitesData || [] };
            })
          );

          // Trier les groupes par l'heure de début de leur première activité
          const groupesTries = [...groupesAvecActivites].sort((a, b) => {
            const heureA = a.activites[0]?.heure_debut || '23:59:59';
            const heureB = b.activites[0]?.heure_debut || '23:59:59';
            return heureA.localeCompare(heureB);
          });

          return { ...jour, groupes: groupesTries };
        })
      );

      setJours(joursAvecGroupes);
    }
    setLoading(false);
  };

  const ajouterJour = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;

    const { error } = await supabase
      .from('planning_jours')
      .insert({ voyage_id: voyageId, date });

    if (!error) {
      setShowNewJour(false);
      loadPlanning();
    }
  };

  const ajouterGroupe = async (jourId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nom = formData.get('nom') as string;
    const nb_inscriptions_max = parseInt(formData.get('nb_inscriptions_max') as string);

    const { error } = await supabase
      .from('groupes_activites')
      .insert({
        planning_jour_id: jourId,
        nom,
        nb_inscriptions_max
      });

    if (!error) {
      setShowNewGroupe(null);
      loadPlanning();
    }
  };

  const ajouterActivite = async (groupeId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase
      .from('activites')
      .insert({
        groupe_id: groupeId,
        titre: formData.get('titre'),
        description: formData.get('description'),
        heure_debut: formData.get('heure_debut'),
        heure_fin: formData.get('heure_fin'),
        jauge: formData.get('jauge') ? parseInt(formData.get('jauge') as string) : null,
        avec_inscription: formData.get('avec_inscription') === 'true',
        est_obligatoire: formData.get('est_obligatoire') === 'true'
      });

    if (!error) {
      setShowNewActivite(null);
      loadPlanning();
    }
  };

  // === FONCTIONS DE MODIFICATION/SUPPRESSION ===

  // Suppression d'un jour
  const supprimerJour = async (jourId: string) => {
    if (confirm('Supprimer ce jour et toutes ses activités ?')) {
      const { error } = await supabase
        .from('planning_jours')
        .delete()
        .eq('id', jourId);
      
      if (!error) loadPlanning();
    }
  };

  // Modification d'un groupe
  const [editingGroupe, setEditingGroupe] = useState<{ id: string; nom: string; nb_inscriptions_max: number } | null>(null);

  const modifierGroupe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingGroupe) return;
    
    const formData = new FormData(e.currentTarget);
    
    const { error } = await supabase
      .from('groupes_activites')
      .update({
        nom: formData.get('nom'),
        nb_inscriptions_max: parseInt(formData.get('nb_inscriptions_max') as string)
      })
      .eq('id', editingGroupe.id);
    
    if (!error) {
      setEditingGroupe(null);
      loadPlanning();
    }
  };

  const supprimerGroupe = async (groupeId: string) => {
    if (confirm('Supprimer ce groupe et toutes ses activités ?')) {
      const { error } = await supabase
        .from('groupes_activites')
        .delete()
        .eq('id', groupeId);
      
      if (!error) loadPlanning();
    }
  };

  // Modification d'une activité
  const [editingActivite, setEditingActivite] = useState<Activite & { groupe_id: string } | null>(null);

  const modifierActivite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingActivite) return;
    
    const formData = new FormData(e.currentTarget);
    
    const { error } = await supabase
      .from('activites')
      .update({
        titre: formData.get('titre'),
        description: formData.get('description'),
        heure_debut: formData.get('heure_debut'),
        heure_fin: formData.get('heure_fin'),
        jauge: formData.get('jauge') ? parseInt(formData.get('jauge') as string) : null,
        avec_inscription: formData.get('avec_inscription') === 'true',
        est_obligatoire: formData.get('est_obligatoire') === 'true'
      })
      .eq('id', editingActivite.id);
    
    if (!error) {
      setEditingActivite(null);
      loadPlanning();
    }
  };

  const supprimerActivite = async (activiteId: string) => {
    if (confirm('Supprimer cette activité ?')) {
      const { error } = await supabase
        .from('activites')
        .delete()
        .eq('id', activiteId);
      
      if (!error) loadPlanning();
    }
  };

  if (!isResponsable) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès réservé aux responsables
        </h3>
        <p className="text-gray-600">
          Seuls les responsables du voyage peuvent gérer le planning.
        </p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">📅 Planning du voyage</h2>
        <button
          onClick={() => setShowNewJour(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Ajouter un jour
        </button>
      </div>

      {/* Liste des jours */}
      {jours.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-gray-600">Aucun jour de planning. Cliquez sur "Ajouter un jour" pour commencer.</p>
        </div>
      ) : (
        jours.map((jour) => (
          <div key={jour.id} className="bg-white rounded-lg border overflow-hidden">
            {/* En-tête du jour */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  {new Date(jour.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewGroupe(jour.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Ajouter un groupe
                  </button>
                  <button
                    onClick={() => supprimerJour(jour.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                    title="Supprimer ce jour"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            {/* Groupes du jour */}
            <div className="p-6 space-y-6">
              {jour.groupes?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun groupe d'activités</p>
              ) : (
                jour.groupes?.map((groupe) => (
                  <div key={groupe.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 border-b flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900">{groupe.nom}</h4>
                        <p className="text-xs text-gray-600">
                          Max {groupe.nb_inscriptions_max} inscription{groupe.nb_inscriptions_max > 1 ? 's' : ''} par élève
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingGroupe({ id: groupe.id, nom: groupe.nom, nb_inscriptions_max: groupe.nb_inscriptions_max })}
                          className="text-sm text-gray-500 hover:text-gray-700"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => supprimerGroupe(groupe.id)}
                          className="text-sm text-red-500 hover:text-red-700"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => setShowNewActivite(groupe.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Activité
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {groupe.activites?.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Aucune activité dans ce groupe</p>
                      ) : (
                        groupe.activites?.map((activite) => (
                          <div key={activite.id} className="border rounded-lg p-4 hover:shadow-sm transition">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{activite.titre}</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  ⏰ {activite.heure_debut.slice(0, 5)} - {activite.heure_fin.slice(0, 5)}
                                </p>
                                {activite.description && (
                                  <p className="text-xs text-gray-500 mt-1">{activite.description}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  {activite.jauge && (
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      🎫 {activite.jauge} places
                                    </span>
                                  )}
                                  {activite.est_obligatoire && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      Obligatoire
                                    </span>
                                  )}
                                  {!activite.avec_inscription && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                      Sans inscription
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => setEditingActivite({ ...activite, groupe_id: groupe.id })}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => supprimerActivite(activite.id)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>


                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}

      {/* Modal d'ajout d'activité */}
      {showNewActivite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Ajouter une activité</h3>
                <button
                  onClick={() => setShowNewActivite(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={(e) => ajouterActivite(showNewActivite, e)} className="p-6 space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  name="titre"
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Visite du musée"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Détails de l'activité..."
                />
              </div>

              {/* Horaires */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure début *
                  </label>
                  <input
                    name="heure_debut"
                    type="time"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure fin *
                  </label>
                  <input
                    name="heure_fin"
                    type="time"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Jauge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jauge (nombre de places)
                </label>
                <input
                  name="jauge"
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Laisser vide pour illimité"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nombre maximum d'élèves pouvant s'inscrire. Laisser vide pour illimité.
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    name="avec_inscription"
                    type="checkbox"
                    defaultChecked={true}
                    value="true"
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Activité avec inscription</span>
                </label>
                <p className="text-xs text-gray-500 -mt-2 ml-6">
                  Si décoché, les élèves peuvent participer sans s'inscrire (pas de comptage de jauge)
                </p>

                <label className="flex items-center gap-2">
                  <input
                    name="est_obligatoire"
                    type="checkbox"
                    value="true"
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Activité obligatoire</span>
                </label>
                <p className="text-xs text-gray-500 -mt-2 ml-6">
                  Tous les élèves sont automatiquement considérés comme participants (pas d'inscription manuelle)
                </p>
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewActivite(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer l'activité
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'ajout de groupe */}
      {showNewGroupe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Ajouter un groupe</h3>
                <button
                  onClick={() => setShowNewGroupe(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={(e) => ajouterGroupe(showNewGroupe, e)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du groupe *
                </label>
                <input
                  name="nom"
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Matin, Après-midi, Option 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre max d'inscriptions par élève *
                </label>
                <input
                  name="nb_inscriptions_max"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Combien d'activités de ce groupe un élève peut-il choisir ?
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewGroupe(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer le groupe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'ajout de jour */}
      {showNewJour && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Ajouter un jour</h3>
                <button
                  onClick={() => setShowNewJour(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={ajouterJour} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  name="date"
                  type="date"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewJour(false)}
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

      {/* Modal de modification de groupe */}
      {editingGroupe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Modifier le groupe</h3>
                <button
                  onClick={() => setEditingGroupe(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={modifierGroupe} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du groupe</label>
                <input
                  name="nom"
                  type="text"
                  defaultValue={editingGroupe.nom}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre max d'inscriptions par élève
                </label>
                <input
                  name="nb_inscriptions_max"
                  type="number"
                  min="1"
                  defaultValue={editingGroupe.nb_inscriptions_max}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGroupe(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de modification d'activité */}
      {editingActivite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Modifier l'activité</h3>
                <button
                  onClick={() => setEditingActivite(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={modifierActivite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  name="titre"
                  type="text"
                  defaultValue={editingActivite.titre}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingActivite.description || ''}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure début *</label>
                  <input
                    name="heure_debut"
                    type="time"
                    defaultValue={editingActivite.heure_debut}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin *</label>
                  <input
                    name="heure_fin"
                    type="time"
                    defaultValue={editingActivite.heure_fin}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jauge</label>
                <input
                  name="jauge"
                  type="number"
                  min="1"
                  defaultValue={editingActivite.jauge || ''}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    name="avec_inscription"
                    type="checkbox"
                    defaultChecked={editingActivite.avec_inscription}
                    value="true"
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Activité avec inscription</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name="est_obligatoire"
                    type="checkbox"
                    defaultChecked={editingActivite.est_obligatoire}
                    value="true"
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Activité obligatoire</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingActivite(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}