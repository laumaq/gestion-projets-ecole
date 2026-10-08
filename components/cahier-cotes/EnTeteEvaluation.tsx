'use client';

import { useState, useEffect, useRef } from 'react';
import { Evaluation } from '@/lib/cahier-cotes/types';

interface EnTeteEvaluationProps {
  evaluation: Evaluation;
  competences: { code: string; libelle: string }[];
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onUpdate: (updates: Partial<Pick<Evaluation, 'nom' | 'date_eval'>>) => void;
  onDelete: () => void;
}

export function EnTeteEvaluation({
  evaluation,
  competences,
  isEditMode,
  onToggleEditMode,
  onUpdate,
  onDelete,
}: EnTeteEvaluationProps) {
  const [nom, setNom] = useState(evaluation.nom);
  const [dateEval, setDateEval] = useState(evaluation.date_eval);
  const nomInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditMode) {
      setTimeout(() => nomInputRef.current?.focus(), 0);
    }
  }, [isEditMode]);

  const handleNomBlur = () => {
    if (nom !== evaluation.nom) {
      onUpdate({ nom });
    }
  };

  const handleDateChange = (newDate: string) => {
    setDateEval(newDate);
    onUpdate({ date_eval: newDate });
  };

  const handleNomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      // Laisse le Tab passer naturellement pour aller à la cellule suivante
      // Mais on commit d'abord le nom
      handleNomBlur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleNomBlur();
      nomInputRef.current?.blur();
      // On pourrait focus la première cellule ici, mais on laisse
      // le parent gérer via un callback si besoin
    }
  };

  return (
    <th className="border border-gray-300 p-0 bg-blue-50 min-w-[120px] align-top">
      {/* Ligne 1 : titre de l'éval + bouton mode édition */}
      <div className="flex items-center justify-between gap-1 px-1 py-1 border-b border-gray-300">
        {isEditMode ? (
          <input
            ref={nomInputRef}
            value={nom}
            onChange={e => setNom(e.target.value)}
            onBlur={handleNomBlur}
            onKeyDown={handleNomKeyDown}
            className="flex-1 text-xs font-semibold border border-blue-400 rounded px-1 py-0.5 bg-white outline-none"
          />
        ) : (
          <span className="flex-1 text-xs font-semibold truncate" title={evaluation.nom}>
            {evaluation.nom}
          </span>
        )}
        <button
          onClick={onToggleEditMode}
          className={`text-[10px] px-1 rounded ${
            isEditMode
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title={isEditMode ? 'Terminer l\'édition' : 'Mode édition'}
        >
          {isEditMode ? '✓' : '✎'}
        </button>
      </div>

      {/* Ligne 1bis : date + suppression */}
      <div className="flex items-center justify-between gap-1 px-1 py-0.5 border-b border-gray-300 bg-blue-50/50">
        {isEditMode ? (
          <input
            type="date"
            value={dateEval}
            onChange={e => handleDateChange(e.target.value)}
            className="text-[10px] border border-blue-400 rounded px-0.5 py-0 bg-white outline-none"
          />
        ) : (
          <span className="text-[10px] text-gray-600">
            {new Date(evaluation.date_eval).toLocaleDateString('fr-BE', {
              day: '2-digit',
              month: '2-digit',
            })}
          </span>
        )}
        {isEditMode && (
          <button
            onClick={() => {
              if (confirm(`Supprimer l'évaluation "${evaluation.nom}" ?`)) {
                onDelete();
              }
            }}
            className="text-[10px] text-red-600 hover:bg-red-50 px-1 rounded"
            title="Supprimer"
          >
            🗑
          </button>
        )}
      </div>

      {/* Ligne 2 : compétences */}
      <div className="flex">
        {competences.map(comp => (
          <div
            key={comp.code}
            className="flex-1 text-[10px] font-medium text-center py-0.5 border-r border-gray-200 last:border-r-0"
            title={comp.libelle}
          >
            {comp.code}
          </div>
        ))}
      </div>
    </th>
  );
}