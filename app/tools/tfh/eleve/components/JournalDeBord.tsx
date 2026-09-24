// app/tools/tfh/eleve/components/JournalDeBord.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Plus, X, BookOpen, Trash2, AlertTriangle, Pencil } from 'lucide-react';

interface JournalEntry {
  type: string;
  titre: string;
  contenu: string;
  date: string;
}

interface EleveInfo {
  student_matricule: number;
  journal: JournalEntry[];
}

interface JournalDeBordProps {
  eleve: EleveInfo;
  onUpdate?: () => void;
}

const TYPE_OPTIONS = [
  { value: 'Objectif', label: '🎯 Objectif', color: 'bg-blue-100 text-blue-800' },
  { value: 'Déroulement', label: '📋 Déroulement', color: 'bg-green-100 text-green-800' },
  { value: 'Réflexion', label: '💭 Réflexion', color: 'bg-purple-100 text-purple-800' },
];

export default function JournalDeBord({ eleve, onUpdate }: JournalDeBordProps) {
  const [showModal, setShowModal] = useState(false);
  // Index de l'entrée en cours d'édition. null = mode création
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [entryType, setEntryType] = useState('Réflexion');
  const [entryTitre, setEntryTitre] = useState('');
  const [entryContent, setEntryContent] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Vérifier que eleve existe avant d'accéder à ses propriétés
  if (!eleve) {
    return null;
  }

  const entries = eleve.journal || [];

  // ============================================================
  // Ouverture du modal
  // ============================================================
  const openCreateModal = () => {
    setEditingIndex(null);
    setEntryType('Réflexion');
    setEntryTitre('');
    setEntryContent('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (entry: JournalEntry, index: number) => {
    setEditingIndex(index);
    setEntryType(entry.type);
    setEntryTitre(entry.titre || '');
    setEntryContent(entry.contenu);
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    setEntryType('Réflexion');
    setEntryTitre('');
    setEntryContent('');
    setError(null);
  };

  // ============================================================
  // Sauvegarde (création OU édition)
  // ============================================================
  const handleSave = async () => {
    if (!entryContent.trim()) {
      setError('Le contenu est requis.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let updatedJournal: JournalEntry[];

      if (editingIndex === null) {
        // --- Mode création ---
        const newEntry: JournalEntry = {
          type: entryType,
          titre: entryTitre.trim(),
          contenu: entryContent.trim(),
          date: new Date().toISOString(),
        };
        updatedJournal = [...entries, newEntry];
      } else {
        // --- Mode édition ---
        // On remplace l'entrée à l'index donné, en PRÉSERVANT sa date d'origine
        updatedJournal = entries.map((e, i) =>
          i === editingIndex
            ? {
                type: entryType,
                titre: entryTitre.trim(),
                contenu: entryContent.trim(),
                date: e.date, // ← date préservée
              }
            : e
        );
      }

      const { error: updateError } = await supabase
        .from('tfh_eleves')
        .update({ journal: updatedJournal })
        .eq('student_matricule', eleve.student_matricule);

      if (updateError) throw updateError;

      closeModal();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // Suppression
  // ============================================================
  const handleDelete = async () => {
    if (editingIndex === null) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedJournal = entries.filter((_, i) => i !== editingIndex);

      const { error: updateError } = await supabase
        .from('tfh_eleves')
        .update({ journal: updatedJournal })
        .eq('student_matricule', eleve.student_matricule);

      if (updateError) throw updateError;

      setShowDeleteConfirm(false);
      closeModal();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // Helpers d'affichage
  // ============================================================
  const getTypeColor = (type: string) => {
    const option = TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const getTypeEmoji = (type: string) => {
    const option = TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.label.split(' ')[0] || '📝';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupEntriesByMonth = (entries: JournalEntry[]) => {
    const groups: Record<string, JournalEntry[]> = {};
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  };

  // Pour préserver l'index global lors de l'affichage par mois,
  // on doit garder la position originale de chaque entrée dans `entries`.
  // On stocke donc l'index d'origine dans la boucle.
  const groupedEntries = groupEntriesByMonth(
    entries.map((e, i) => ({ ...e, __idx: i }))
  );

  const formatEditDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-800">Journal de bord</h3>
          <span className="text-xs text-gray-400">
            ({entries.length} entrée{entries.length > 1 ? 's' : ''})
          </span>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" />
          Ajouter une entrée
        </button>
      </div>

      {/* Liste des entrées */}
      {entries.length === 0 ? (
        <div className="text-center py-8 bg-white/40 rounded-lg">
          <p className="text-gray-500">Aucune entrée dans votre journal pour le moment.</p>
          <p className="text-sm text-gray-400 mt-1">Commencez par ajouter votre première réflexion !</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {Object.entries(groupedEntries).map(([monthKey, monthEntries]) => {
            const [year, month] = monthKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

            return (
              <div key={monthKey} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {monthName}
                  </span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {monthEntries
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry: any) => {
                    const originalIndex = entry.__idx;
                    return (
                      <button
                        key={originalIndex}
                        type="button"
                        onClick={() => openEditModal(entry, originalIndex)}
                        className="w-full text-left bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{getTypeEmoji(entry.type)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                              {entry.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(entry.date)}
                            </span>
                            <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>

                        {entry.titre && (
                          <h4 className="mt-2 font-medium text-gray-800">{entry.titre}</h4>
                        )}

                        <p className="mt-1.5 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                          {entry.contenu}
                        </p>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingIndex === null ? 'Nouvelle entrée' : 'Modifier l\'entrée'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Bandeau date d'origine en mode édition */}
            {editingIndex !== null && (
              <div className="mb-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Entrée du <strong>{formatEditDate(entries[editingIndex].date)}</strong>
                  <span className="text-gray-400 ml-1">(date préservée)</span>
                </span>
              </div>
            )}

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type de réflexion
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEntryType(option.value)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${entryType === option.value
                          ? `${option.color} ring-2 ring-offset-1 ring-indigo-400`
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre (optionnel) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Titre <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={entryTitre}
                  onChange={(e) => setEntryTitre(e.target.value)}
                  maxLength={120}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  placeholder="Ex : Recherche biblio terminée"
                />
                <div className="text-right text-[10px] text-gray-400 mt-0.5">
                  {entryTitre.length}/120
                </div>
              </div>

              {/* Contenu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contenu
                </label>
                <textarea
                  value={entryContent}
                  onChange={(e) => {
                    setEntryContent(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={5}
                  className={`
                    w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white
                    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'}
                  `}
                  placeholder="Décrivez votre réflexion, votre avancement, vos objectifs..."
                />
                {error && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <span>⚠️</span>
                    {error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center gap-2 pt-2">
                {/* Bouton supprimer (mode édition uniquement) */}
                {editingIndex !== null ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSubmitting || !entryContent.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></span>
                        Enregistrement...
                      </span>
                    ) : (
                      editingIndex === null ? 'Enregistrer' : 'Mettre à jour'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && editingIndex !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Supprimer cette entrée ?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Cette action est définitive. L'entrée du {formatEditDate(entries[editingIndex].date)} sera retirée de votre carnet de bord.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}