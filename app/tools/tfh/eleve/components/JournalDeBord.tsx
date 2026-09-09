// app/tools/tfh/eleve/components/JournalDeBord.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Plus, X, BookOpen } from 'lucide-react';

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
  const [entryType, setEntryType] = useState('Réflexion');
  const [entryContent, setEntryContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier que eleve existe avant d'accéder à ses propriétés
  if (!eleve) {
    return null;
  }

  const entries = eleve.journal || [];

  const handleAddEntry = async () => {
    if (!entryContent.trim()) {
      setError('Le contenu est requis.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Créer la nouvelle entrée
      const newEntry: JournalEntry = {
        type: entryType,
        titre: '',
        contenu: entryContent.trim(),
        date: new Date().toISOString(),
      };

      // Mettre à jour le journal
      const updatedJournal = [...entries, newEntry];

      const { error: updateError } = await supabase
        .from('tfh_eleves')
        .update({ journal: updatedJournal })
        .eq('student_matricule', eleve.student_matricule);

      if (updateError) throw updateError;

      // Réinitialiser le formulaire
      setEntryContent('');
      setShowModal(false);
      
      // Rafraîchir les données
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erreur lors de l\'ajout de l\'entrée:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const groupedEntries = groupEntriesByMonth(entries);

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
          onClick={() => setShowModal(true)}
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
                  .map((entry, index) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getTypeEmoji(entry.type)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                            {entry.type}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      
                      {entry.titre && (
                        <h4 className="mt-2 font-medium text-gray-800">{entry.titre}</h4>
                      )}
                      
                      <p className="mt-1.5 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {entry.contenu}
                      </p>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'ajout */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Nouvelle entrée</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

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
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEntryContent('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={isSubmitting || !entryContent.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></span>
                      Enregistrement...
                    </span>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}