// components/votes/VoteCreator.tsx
'use client';

import { useState } from 'react';
import { useVotes } from '@/hooks/votes/useVotes';
import { getErrorMessage } from '@/lib/errors';

type ShowResultsType = 'always' | 'after_vote' | 'after_close';
type ScrutinType = 'uninominal' | 'plurinominal' | 'jugement' | 'rang';

interface VoteCreatorProps {
  context: { module: string; id: string };
  communicationId?: string;
  interventionLibreId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoteCreator({ 
  context, 
  communicationId,
  interventionLibreId,
  onClose, 
  onSuccess 
}: VoteCreatorProps) {
  const { createVote } = useVotes(context);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    question: '',
    options: ['', ''],
    type_scrutin: 'uninominal' as ScrutinType,
    anonymous: true,
    show_results: 'after_vote' as ShowResultsType
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Créer un objet avec les données du vote
      const voteData: any = {
        titre: formData.titre,
        description: formData.description,
        question: formData.question,
        options: formData.options.filter(opt => opt.trim() !== ''),
        type_scrutin: formData.type_scrutin,
        parametres: {
          anonymous: formData.anonymous,
          show_results: formData.show_results
        }
      };

      // Ajouter communicationId ou interventionLibreId si présents
      if (communicationId) {
        voteData.communicationId = communicationId;
      }
      
      if (interventionLibreId) {
        voteData.interventionLibreId = interventionLibreId;
      }

      await createVote(voteData);
      onSuccess();
    } catch (error) {
      console.error('Erreur création vote:', getErrorMessage(error));
      alert(`Erreur: ${getErrorMessage(error)}`);
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
          <h2 className="text-xl font-bold">Créer un nouveau vote</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              placeholder="Ex: Faut-il acheter ce matériel ?"
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
              placeholder="Contexte, explications..."
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
              placeholder="Ex: Êtes-vous pour l'achat de ce matériel ?"
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
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="uninominal">Uninominal (un seul choix)</option>
              <option value="plurinominal">Plurinominal (plusieurs choix)</option>
              <option value="jugement">Jugement (notation)</option>
              <option value="rang">Classement (ordre de préférence)</option>
            </select>
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
              <span className="text-sm">Vote anonyme</span>
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

            {/* Afficher un petit indicateur du contexte */}
            {communicationId && (
              <p className="text-xs text-gray-500">
                Ce vote sera lié à votre intervention de GT
              </p>
            )}
            {interventionLibreId && (
              <p className="text-xs text-gray-500">
                Ce vote sera lié à votre intervention libre
              </p>
            )}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Créer le vote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}