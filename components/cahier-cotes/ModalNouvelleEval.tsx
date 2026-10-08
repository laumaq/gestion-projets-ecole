'use client';

import { useState } from 'react';
import { MatiereCompetence } from '@/lib/cahier-cotes/types';

interface ModalNouvelleEvalProps {
  competences: MatiereCompetence[];
  onClose: () => void;
  onCreate: (params: {
    nom: string;
    dateEval: string;
    competences: string[];
  }) => Promise<void>;
}

export function ModalNouvelleEval({
  competences,
  onClose,
  onCreate,
}: ModalNouvelleEvalProps) {
  const [nom, setNom] = useState('');
  const [dateEval, setDateEval] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [competencesSelectionnees, setCompetencesSelectionnees] = useState<string[]>(
    competences.map(c => c.code) // Par défaut : toutes cochées
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCompetence = (code: string) => {
    setCompetencesSelectionnees(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async () => {
    if (!nom.trim()) {
      setError('Le nom de l\'évaluation est requis.');
      return;
    }
    if (competencesSelectionnees.length === 0) {
      setError('Sélectionne au moins une compétence.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({
        nom: nom.trim(),
        dateEval,
        competences: competencesSelectionnees,
      });
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Nouvelle évaluation</h2>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Nom de l'évaluation
            </label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              autoFocus
              placeholder="Ex : Contrôle 1, Labo optique, ..."
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Date de l'évaluation
            </label>
            <input
              type="date"
              value={dateEval}
              onChange={e => setDateEval(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Compétences */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Compétences évaluées
            </label>
            <div className="space-y-2">
              {competences.map(c => (
                <label
                  key={c.code}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={competencesSelectionnees.includes(c.code)}
                    onChange={() => toggleCompetence(c.code)}
                    className="w-4 h-4"
                  />
                  <span className="font-mono text-sm font-semibold w-8">
                    {c.code}
                  </span>
                  <span className="text-sm text-gray-700">{c.libelle}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}