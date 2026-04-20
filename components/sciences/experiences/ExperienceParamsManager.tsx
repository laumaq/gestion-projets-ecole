'use client';

import { useState, useEffect } from 'react';

interface ExperienceParams {
  canAddNewMeasures: boolean;
  freezeDataBefore?: string;
  showCorrectionsForBefore?: string;
}

interface ExperienceParamsManagerProps {
  params: ExperienceParams;
  onSave: (params: ExperienceParams) => void;
  onCancel: () => void;
}

export default function ExperienceParamsManager({ params, onSave, onCancel }: ExperienceParamsManagerProps) {  const [canAddNewMeasures, setCanAddNewMeasures] = useState(params.canAddNewMeasures ?? true);
  console.log('ExperienceParamsManager - params reçus:', params);
  const [freezeDataBefore, setFreezeDataBefore] = useState(params.freezeDataBefore ?? '');
  const [showCorrectionsForBefore, setShowCorrectionsForBefore] = useState(params.showCorrectionsForBefore ?? '');
  const [useFreeze, setUseFreeze] = useState(!!params.freezeDataBefore);
  const [useCorrections, setUseCorrections] = useState(!!params.showCorrectionsForBefore);


  useEffect(() => {
    setCanAddNewMeasures(params.canAddNewMeasures ?? true);
    setFreezeDataBefore(params.freezeDataBefore ?? '');
    setShowCorrectionsForBefore(params.showCorrectionsForBefore ?? '');
    setUseFreeze(!!params.freezeDataBefore);
    setUseCorrections(!!params.showCorrectionsForBefore);
  }, [params]);  

  const handleSave = () => {
    onSave({
      canAddNewMeasures,
      freezeDataBefore: useFreeze ? freezeDataBefore : undefined,
      showCorrectionsForBefore: useCorrections ? showCorrectionsForBefore : undefined
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Paramètres de l'expérience</h3>
      
      {/* Option 1 : Ajout de nouvelles mesures */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={canAddNewMeasures}
            onChange={(e) => setCanAddNewMeasures(e.target.checked)}
            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
          />
          <div>
            <span className="font-medium text-gray-900">Les élèves peuvent ajouter de nouvelles mesures</span>
            <p className="text-sm text-gray-500">
              Permet aux élèves de faire un deuxième essai sans perdre l'historique
            </p>
          </div>
        </label>
      </div>

      {/* Option 2 : Geler les anciennes mesures */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={useFreeze}
            onChange={(e) => setUseFreeze(e.target.checked)}
            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
          />
          <div>
            <span className="font-medium text-gray-900">Geler les anciennes mesures</span>
            <p className="text-sm text-gray-500">
              Les mesures entrées avant cette date ne pourront plus être modifiées ni supprimées
            </p>
          </div>
        </label>
        
        {useFreeze && (
          <div className="ml-7">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de gel
            </label>
            <input
              type="datetime-local"
              value={freezeDataBefore}
              onChange={(e) => setFreezeDataBefore(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Les mesures entrées avant cette date seront verrouillées (non modifiables)
            </p>
          </div>
        )}
      </div>

      {/* Option 3 : Afficher les corrections pour les anciennes mesures */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={useCorrections}
            onChange={(e) => setUseCorrections(e.target.checked)}
            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
          />
          <div>
            <span className="font-medium text-gray-900">Afficher les corrections</span>
            <p className="text-sm text-gray-500">
              Les élèves verront les corrections pour les mesures entrées avant cette date
            </p>
          </div>
        </label>
        
        {useCorrections && (
          <div className="ml-7">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date limite (corrections pour les mesures avant cette date)
            </label>
            <input
              type="datetime-local"
              value={showCorrectionsForBefore}
              onChange={(e) => setShowCorrectionsForBefore(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Les élèves verront la valeur calculée (correction) pour les mesures qu'ils ont entrées avant cette date
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
}