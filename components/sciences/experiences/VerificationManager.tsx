// components/sciences/experiences/VerificationManager.tsx


'use client';

import { useState } from 'react';
import { ExpressionEvaluator } from '@/lib/sciences/expressionEvaluator';

interface VerificationConfig {
  tableau_index: number;
  nom: string;
  expression: string;
  variable_cible: string;
  tolerance: number;
  active: boolean;
}

interface VerificationManagerProps {
  tableaux: {
    nom: string;
    colonnes: { nom: string; unite: string; type: string; }[];
  }[];
  verifications: VerificationConfig[];
  onSave: (verifications: VerificationConfig[]) => void;
  onCancel: () => void;
}

export default function VerificationManager({ tableaux, verifications, onSave, onCancel }: VerificationManagerProps) {
  const [tempVerifications, setTempVerifications] = useState<VerificationConfig[]>(verifications);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [validationStatus, setValidationStatus] = useState<Record<number, { isValid: boolean; error?: string; formatted?: string }>>({});
  
  const ajouterVerification = () => {
    const newIndex = tempVerifications.length;
    setTempVerifications([
      ...tempVerifications,
      {
        tableau_index: 0,
        nom: `Vérification ${tempVerifications.length + 1}`,
        expression: '',
        variable_cible: tableaux[0]?.colonnes[0]?.nom || '',
        tolerance: 5,
        active: true
      }
    ]);
    setEditingIndex(newIndex);
  };

  const supprimerVerification = (index: number) => {
    setTempVerifications(tempVerifications.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    const newValidationStatus = { ...validationStatus };
    delete newValidationStatus[index];
    setValidationStatus(newValidationStatus);
  };

  const updateVerification = (index: number, field: keyof VerificationConfig, value: any) => {
    const nouvelles = [...tempVerifications];
    nouvelles[index] = { ...nouvelles[index], [field]: value };
    setTempVerifications(nouvelles);
    
    if (field === 'expression' || field === 'tableau_index') {
      const tableau = tableaux[nouvelles[index].tableau_index];
      const colonnesDisponibles = tableau?.colonnes.map(c => c.nom) || [];
      // Extraire la première partie avant && pour la validation (la partie qui contient l'égalité)
      let expressionToValidate = value || '';
      if (expressionToValidate.includes('&&')) {
        expressionToValidate = expressionToValidate.split('&&')[0].trim();
      }
      const result = ExpressionEvaluator.parseExpression(expressionToValidate, colonnesDisponibles);
      setValidationStatus(prev => ({
        ...prev,
        [index]: {
          isValid: result.isValid,
          error: result.error,
          formatted: result.isValid ? ExpressionEvaluator.formaterExpression(value || '') : undefined
        }
      }));
    }
  };

  const toggleActive = (index: number) => {
    const nouvelles = [...tempVerifications];
    nouvelles[index].active = !nouvelles[index].active;
    setTempVerifications(nouvelles);
  };

  const handleSave = () => {
    onSave(tempVerifications);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Vérifications automatiques</h3>
        <button
          type="button"
          onClick={ajouterVerification}
          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
        >
          + Ajouter une vérification
        </button>
      </div>

      {tempVerifications.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucune vérification configurée</p>
          <p className="text-sm text-gray-400 mt-1">Ajoutez une relation mathématique pour évaluer les élèves</p>
        </div>
      )}

      {tempVerifications.map((verif, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={verif.nom}
                onChange={(e) => updateVerification(index, 'nom', e.target.value)}
                className="text-md font-medium bg-transparent border-b border-gray-300 focus:border-green-500 outline-none px-1"
                placeholder="Nom de la vérification"
              />
              <button
                onClick={() => toggleActive(index)}
                className={`px-2 py-1 text-xs rounded-full ${
                  verif.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {verif.active ? '✓ Active' : 'Inactive'}
              </button>
            </div>
            <button
              onClick={() => supprimerVerification(index)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Supprimer
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tableau de données</label>
              <select
                value={verif.tableau_index}
                onChange={(e) => updateVerification(index, 'tableau_index', parseInt(e.target.value))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {tableaux.map((t, i) => (
                  <option key={i} value={i}>{t.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Colonne mesurée (cible)</label>
              <select
                value={verif.variable_cible}
                onChange={(e) => updateVerification(index, 'variable_cible', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {tableaux[verif.tableau_index]?.colonnes.map((col) => (
                  <option key={col.nom} value={col.nom}>
                    {col.nom} ({col.unite})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">
              Relation mathématique
              <span className="text-gray-400 ml-2">Ex: {`{U} = {R} * {I} && {U} > 5`}</span>
            </label>
            <input
              type="text"
              value={verif.expression}
              onChange={(e) => updateVerification(index, 'expression', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              placeholder="{grandeur_cible} = expression avec {autres_grandeurs} [&& autre condition]"
            />
            {validationStatus[index]?.formatted && (
              <div className="mt-1 text-sm text-gray-600">
                {validationStatus[index].formatted.split('&&').map((part, i) => (
                  <div key={i} className="font-mono">{part.trim()}</div>
                ))}
              </div>
            )}
            {validationStatus[index] && !validationStatus[index].isValid && (
              <div className="mt-1 text-sm text-red-500">
                ⚠️ {validationStatus[index].error}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Tolérance (%)
            </label>
            <input
              type="number"
              value={verif.tolerance}
              onChange={(e) => updateVerification(index, 'tolerance', parseFloat(e.target.value))}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              step="0.5"
              min="0"
            />
          </div>
        </div>
      ))}

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Sauvegarder les vérifications
        </button>
      </div>
    </div>
  );
}