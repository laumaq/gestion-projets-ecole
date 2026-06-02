// components/votes/VoteEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { Vote } from '@/hooks/votes/useVotes';
import { useVotes } from '@/hooks/votes/useVotes';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';

type ShowResultsType = 'always' | 'after_vote' | 'after_close';
type ScrutinType = 'uninominal' | 'plurinominal' | 'jugement' | 'rang';

interface VoteEditorProps {
  vote: Vote;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoteEditor({ vote, onClose, onSuccess }: VoteEditorProps) {
  const { updateVote } = useVotes({ 
    module: vote.module_contexte, 
    id: vote.module_id 
  });
  
  const [formData, setFormData] = useState({
    titre: vote.titre,
    description: vote.description || '',
    question: vote.question,
    options: vote.options.map(opt => opt.texte),
    type_scrutin: vote.type_scrutin,
    anonymous: vote.parametres.anonymous,
    anonymous_vote: vote.anonymous_vote || false,
    show_results: vote.parametres.show_results
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingVotes, setHasExistingVotes] = useState(false);

  useEffect(() => {
    const checkExistingVotes = async () => {
      // Interroge la base de données pour compter les bulletins
      const { count, error } = await supabase
        .from('vote_ballots')      // Table des bulletins de vote
        .select('id', { count: 'exact', head: true })  // On veut juste le nombre, pas les données
        .eq('vote_id', vote.id);   // On filtre pour le vote actuel

      if (!error && count !== null) {
        // Si count > 0, il y a déjà des votes
        setHasExistingVotes(count > 0);
      }
    };
    
    checkExistingVotes();
  }, [vote.id]);  // Se relance si l'ID du vote change

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.options.filter(opt => opt.trim() !== '').length < 2) {
      setError('Veuillez ajouter au moins 2 options');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      // Vérifier si le type a changé
      const typeHasChanged = formData.type_scrutin !== vote.type_scrutin;
      
      const updatedOptions = formData.options.map((texte, index) => ({
        id: vote.options[index]?.id || crypto.randomUUID(),
        texte,
        ordre: index
      }));

      await updateVote(vote.id, {
        titre: formData.titre,
        description: formData.description,
        question: formData.question,
        options: updatedOptions,
        ...(typeHasChanged && { type_scrutin: formData.type_scrutin }), // Ne passer que si changement
        parametres: {
          anonymous: formData.anonymous,
          max_choices: 1,
          min_choices: 1,
          allow_blank: false,
          allow_modify: false,
          show_results: formData.show_results
        },
        anonymous_vote: formData.anonymous_vote
      });
      
      onSuccess();
    } catch (err) {
      console.error('Erreur modification vote:', err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Modifier le vote</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du vote
            </label>
            <input
              type="text"
              required
              value={formData.titre}
              onChange={e => setFormData(prev => ({ ...prev, titre: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optionnelle)
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question posée aux votants
            </label>
            <input
              type="text"
              required
              value={formData.question}
              onChange={e => setFormData(prev => ({ ...prev, question: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Type de scrutin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de scrutin
            </label>
            <select
              value={formData.type_scrutin}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                type_scrutin: e.target.value as ScrutinType
              }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                hasExistingVotes ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={hasExistingVotes}
            >
              <option value="uninominal">Uninominal (un seul choix)</option>
              <option value="plurinominal">Plurinominal (plusieurs choix)</option>
              <option value="jugement">Jugement majoritaire (mentions)</option>
              <option value="rang">Classement (ordre de préférence)</option>
            </select>
            
            {hasExistingVotes ? (
              <p className="text-xs text-red-600 mt-1">
                ❌ Le type de scrutin ne peut plus être modifié car des votes ont déjà été enregistrés.
              </p>
            ) : (
              <p className="text-xs text-green-600 mt-1">
                ✓ Aucun vote enregistré pour le moment. Vous pouvez modifier le type de scrutin.
              </p>
            )}
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options de réponse
            </label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={option}
                    onChange={e => {
                      const newOptions = [...formData.options];
                      newOptions[index] = e.target.value;
                      setFormData(prev => ({ ...prev, options: newOptions }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <span className="text-xl">+</span>
                Ajouter une option
              </button>
            </div>
          </div>

          {/* Paramètres */}
          <div className="space-y-4">
            <h3 className="font-medium">Paramètres du vote</h3>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.anonymous}
                onChange={e => setFormData(prev => ({ ...prev, anonymous: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm">Afficher comme vote anonyme (icône)</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.anonymous_vote}
                onChange={e => setFormData(prev => ({ ...prev, anonymous_vote: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm">🔒 Vote anonyme avec vérification par hash</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Affichage des résultats
              </label>
              <select
                value={formData.show_results}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  show_results: e.target.value as ShowResultsType
                }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="after_close">Après la clôture du vote</option>
                <option value="after_vote">Après avoir voté</option>
                <option value="always">Toujours visibles</option>
              </select>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}