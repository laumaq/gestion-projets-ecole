// app/tools/tfh/components/DefenseEditModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eleve, Guide, Externe } from '@/app/tools/tfh/coordination/types';
import { X, Save, AlertCircle } from 'lucide-react';

interface DefenseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  eleve: Eleve | null;
  guides: Guide[];
  externes: Externe[];
  allEleves: Eleve[];
  onSave: (studentMatricule: number, updates: Partial<Eleve>) => Promise<void>;
  onRefresh: () => void;
}

export default function DefenseEditModal({
  isOpen,
  onClose,
  eleve,
  guides,
  externes,
  allEleves,
  onSave,
  onRefresh
}: DefenseEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Eleve>>({});

  // Récupérer toutes les dates existantes
  const existingDates = Array.from(new Set(
    allEleves.filter(e => e.date_defense).map(e => e.date_defense!)
  )).sort();

  // Récupérer toutes les heures existantes
  const existingTimes = Array.from(new Set(
    allEleves.filter(e => e.heure_defense).map(e => e.heure_defense!)
  )).sort();

  // Récupérer tous les locaux existants
  const existingLocations = Array.from(new Set(
    allEleves.filter(e => e.localisation_defense).map(e => e.localisation_defense!)
  )).sort();

  useEffect(() => {
    if (eleve) {
      setFormData({
        date_defense: eleve.date_defense || '',
        heure_defense: eleve.heure_defense || '',
        localisation_defense: eleve.localisation_defense || '',
        lecteur_interne_id: eleve.lecteur_interne_id || '',
        lecteur_externe_id: eleve.lecteur_externe_id || '',
        mediateur_id: eleve.mediateur_id || '',
      });
    }
  }, [eleve]);

  if (!isOpen || !eleve) return null;

  const currentDateTime = formData.date_defense && formData.heure_defense
    ? new Date(`${formData.date_defense}T${formData.heure_defense}`).getTime()
    : null;

  // Fonction pour vérifier si une personne est déjà prise sur le créneau
  const isPersonBusy = (personId: string | null | undefined, type: 'lecteur_interne' | 'lecteur_externe' | 'mediateur'): boolean => {
    if (!personId || !currentDateTime || isNaN(currentDateTime)) return false;

    const conflictingEleves = allEleves.filter(e => {
      if (e.student_matricule === eleve.student_matricule) return false;
      const eDateTime = e.date_defense && e.heure_defense
        ? new Date(`${e.date_defense}T${e.heure_defense}`).getTime()
        : null;
      return eDateTime === currentDateTime;
    });

    return conflictingEleves.some(e => {
      if (type === 'lecteur_interne') return e.lecteur_interne_id === personId;
      if (type === 'lecteur_externe') return e.lecteur_externe_id === personId;
      return e.mediateur_id === personId;
    });
  };

  // Obtenir les options disponibles pour les selecteurs
  const getAvailableLecteursInternes = () => {
    return guides.map(guide => ({
      id: guide.id,
      label: `${guide.nom} ${guide.prenom}`,
      busy: isPersonBusy(guide.id, 'lecteur_interne')
    }));
  };

  const getAvailableLecteursExternes = () => {
    return externes
      .filter(e => e.lecteur_externe_id)
      .map(e => ({
        id: e.lecteur_externe_id!,
        label: `${e.nom} ${e.prenom}`,
        busy: isPersonBusy(e.lecteur_externe_id, 'lecteur_externe')
      }));
  };

  const getAvailableMediateurs = () => {
    return externes
      .filter(e => e.mediateur_id)
      .map(e => ({
        id: e.mediateur_id!,
        label: `${e.nom} ${e.prenom}`,
        busy: isPersonBusy(e.mediateur_id, 'mediateur')
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(eleve.student_matricule, formData);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const lecteurInterneLabel = guides.find(g => g.id === formData.lecteur_interne_id)
    ? `${guides.find(g => g.id === formData.lecteur_interne_id)!.nom} ${guides.find(g => g.id === formData.lecteur_interne_id)!.prenom}`
    : '';

  const lecteurExterneLabel = externes.find(e => e.lecteur_externe_id === formData.lecteur_externe_id)
    ? `${externes.find(e => e.lecteur_externe_id === formData.lecteur_externe_id)!.nom} ${externes.find(e => e.lecteur_externe_id === formData.lecteur_externe_id)!.prenom}`
    : '';

  const mediateurLabel = externes.find(e => e.mediateur_id === formData.mediateur_id)
    ? `${externes.find(e => e.mediateur_id === formData.mediateur_id)!.nom} ${externes.find(e => e.mediateur_id === formData.mediateur_id)!.prenom}`
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-800">
            Édition de la défense - {eleve.prenom} {eleve.nom}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps du formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Informations élève */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-2">Informations élève</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Classe :</span> {eleve.classe || '-'}</div>
              <div><span className="font-medium">Catégorie :</span> {eleve.categorie || '-'}</div>
              <div className="col-span-2"><span className="font-medium">Problématique :</span> {eleve.problematique || '-'}</div>
            </div>
          </div>

          {/* Planning */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Planning</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <select
                  value={formData.date_defense || ''}
                  onChange={(e) => setFormData({ ...formData, date_defense: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Sélectionner -</option>
                  {existingDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('fr-FR')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
                <select
                  value={formData.heure_defense || ''}
                  onChange={(e) => setFormData({ ...formData, heure_defense: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Sélectionner -</option>
                  {existingTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                <select
                  value={formData.localisation_defense || ''}
                  onChange={(e) => setFormData({ ...formData, localisation_defense: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Sélectionner -</option>
                  {existingLocations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Jury */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Jury</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guide (actuel : {eleve.guide_nom || '-'} {eleve.guide_prenom || ''})
                </label>
                <div className="text-sm text-gray-500 italic">Le guide ne peut pas être modifié ici. Contactez le coordinateur.</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lecteur interne</label>
                <select
                  value={formData.lecteur_interne_id || ''}
                  onChange={(e) => setFormData({ ...formData, lecteur_interne_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Sélectionner -</option>
                  {getAvailableLecteursInternes().map(opt => (
                    <option key={opt.id} value={opt.id} className={opt.busy ? 'text-red-500' : ''}>
                      {opt.label} {opt.busy ? '(⚠️ déjà pris sur ce créneau)' : ''}
                    </option>
                  ))}
                </select>
                {formData.lecteur_interne_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    Actuel : {lecteurInterneLabel}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lecteur externe</label>
                <select
                  value={formData.lecteur_externe_id || ''}
                  onChange={(e) => setFormData({ ...formData, lecteur_externe_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Sélectionner -</option>
                  {getAvailableLecteursExternes().map(opt => (
                    <option key={opt.id} value={opt.id} className={opt.busy ? 'text-red-500' : ''}>
                      {opt.label} {opt.busy ? '(⚠️ déjà pris sur ce créneau)' : ''}
                    </option>
                  ))}
                </select>
                {formData.lecteur_externe_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    Actuel : {lecteurExterneLabel}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Médiateur</label>
                <select
                  value={formData.mediateur_id || ''}
                  onChange={(e) => setFormData({ ...formData, mediateur_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">- Sélectionner -</option>
                  {getAvailableMediateurs().map(opt => (
                    <option key={opt.id} value={opt.id} className={opt.busy ? 'text-red-500' : ''}>
                      {opt.label} {opt.busy ? '(⚠️ déjà pris sur ce créneau)' : ''}
                    </option>
                  ))}
                </select>
                {formData.mediateur_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    Actuel : {mediateurLabel}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}