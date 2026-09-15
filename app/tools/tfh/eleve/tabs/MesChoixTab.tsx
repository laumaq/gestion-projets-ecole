// app/tools/tfh/eleve/tabs/MesChoixTab.tsx
'use client';

import { useState } from 'react';
import { 
  Target, BookOpen, PenSquare, ChevronRight, Info 
} from 'lucide-react';
import { EleveInfo, TypeTFHDisplay } from '../types';
import { getIconComponent } from '../utils/constants';

interface MesChoixTabProps {
  eleve: EleveInfo;
  typesDisponibles: TypeTFHDisplay[];
  loadingTypes: boolean;
  savingType: boolean;
  autorisationModification: boolean;
  onSaveType: (type: string) => void;
  onSaveField: (field: string, value: any) => void;
  onOpenInfoModal: (type: string, label: string) => void;
}

export default function MesChoixTab({
  eleve,
  typesDisponibles,
  loadingTypes,
  savingType,
  autorisationModification,
  onSaveType,
  onSaveField,
  onOpenInfoModal,
}: MesChoixTabProps) {
  const [editingThematique, setEditingThematique] = useState(false);
  const [newThematique, setNewThematique] = useState(eleve.thematique || '');
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState(eleve.description || '');
  const [editingSource, setEditingSource] = useState<number | null>(null);
  const [newSourceValue, setNewSourceValue] = useState('');

  const handleSaveThematique = async () => {
    await onSaveField('thematique', newThematique);
    setEditingThematique(false);
  };

  const handleSaveDescription = async () => {
    await onSaveField('description', newDescription);
    setEditingDescription(false);
  };

  const handleSaveSource = async (num: number) => {
    await onSaveField(`source_${num}`, newSourceValue);
    setEditingSource(null);
  };

  const startEditSource = (num: number, currentValue: string) => {
    setEditingSource(num);
    setNewSourceValue(currentValue);
  };

  return (
    <div className="space-y-6">
      {/* Type de TFH */}
      <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-800">Type de TFH</h3>
            <span className="text-xs text-gray-400 ml-1">(choisis ton type de travail)</span>
          </div>
          <span className="text-xs text-gray-500">
            {savingType && <span className="text-indigo-600">💾 Sauvegarde...</span>}
            {loadingTypes && <span className="text-gray-400">⏳ Chargement...</span>}
          </span>
        </div>

        {loadingTypes ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : typesDisponibles.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>Aucun type de TFH n'a été configuré.</p>
            <p className="text-sm">Contacte ton coordinateur pour en ajouter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {typesDisponibles.map((type) => {
              const Icon = getIconComponent(type.icon);
              const isSelected = eleve.type === type.key;
              return (
                <div key={type.key} className="relative group">
                  <button
                    onClick={() => onSaveType(type.key)}
                    disabled={savingType}
                    className={`
                      w-full flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                      ${isSelected 
                        ? `${type.color} border-current shadow-md scale-[1.02]` 
                        : 'bg-white/60 border-gray-200 hover:border-indigo-300 hover:bg-white/80'}
                      ${savingType ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      relative
                    `}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-current' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-current' : 'text-gray-600'}`}>
                      {type.label}
                    </span>
                    {isSelected && <span className="text-xs text-green-600">✅</span>}
                  </button>
                  <button
                    onClick={() => onOpenInfoModal(type.key, type.label)}
                    className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 hover:scale-110 transition-all duration-200 group-hover:shadow-lg"
                    title={`En savoir plus sur ${type.label}`}
                  >
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {eleve.type && !loadingTypes && typesDisponibles.length > 0 && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Type actuel : <span className="font-medium text-gray-700">
              {typesDisponibles.find(t => t.key === eleve.type)?.label || eleve.type}
            </span>
            <button
              onClick={() => {
                const type = typesDisponibles.find(t => t.key === eleve.type);
                if (type) onOpenInfoModal(type.key, type.label);
              }}
              className="ml-2 text-indigo-600 hover:text-indigo-800 hover:underline text-xs"
            >
              En savoir plus
            </button>
          </div>
        )}
      </div>

      {/* Thématique */}
      <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 rounded-xl p-5 border border-teal-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-semibold text-gray-800">Thématique</h3>
          </div>
          {!editingThematique && autorisationModification && (
            <button
              onClick={() => setEditingThematique(true)}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              {eleve.thematique ? 'Modifier' : 'Ajouter'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {editingThematique ? (
          <div className="space-y-3">
            <input
              type="text"
              value={newThematique}
              onChange={(e) => setNewThematique(e.target.value)}
              className="w-full border border-teal-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              placeholder="Ex: Transition écologique, Intelligence artificielle..."
            />
            <div className="flex gap-2">
              <button onClick={handleSaveThematique} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                Enregistrer
              </button>
              <button
                onClick={() => { setEditingThematique(false); setNewThematique(eleve.thematique || ''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 rounded-lg p-3 text-gray-700">
            {eleve.thematique || <span className="text-gray-400 italic">Aucune thématique définie</span>}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="bg-gradient-to-r from-blue-50/80 to-sky-50/80 rounded-xl p-5 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PenSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-800">Description de votre projet</h3>
          </div>
          {!editingDescription && autorisationModification && (
            <button
              onClick={() => setEditingDescription(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {eleve.description ? 'Modifier' : 'Ajouter'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {editingDescription ? (
          <div className="space-y-3">
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full border border-blue-200 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              placeholder="Décrivez ce que vous imaginez pour votre TFH..."
            />
            <div className="flex gap-2">
              <button onClick={handleSaveDescription} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Enregistrer
              </button>
              <button
                onClick={() => { setEditingDescription(false); setNewDescription(eleve.description || ''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
            {eleve.description || <span className="text-gray-400 italic">Aucune description définie</span>}
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl p-5 border border-amber-100">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-semibold text-gray-800">Sources documentaires</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((num) => {
            const sourceField = `source_${num}` as keyof EleveInfo;
            const currentValue = (eleve[sourceField] as string) || '';
            const isEditing = editingSource === num;

            return (
              <div key={num} className="bg-white/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-600">Source {num}</label>
                  {!isEditing && autorisationModification && (
                    <button
                      onClick={() => startEditSource(num, currentValue)}
                      className="text-xs text-amber-600 hover:text-amber-700"
                    >
                      {currentValue ? 'Modifier' : 'Ajouter'}
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newSourceValue}
                      onChange={(e) => setNewSourceValue(e.target.value)}
                      className="w-full border border-amber-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                      placeholder="Titre de la source, lien, référence..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveSource(num)}
                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditingSource(null)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    {currentValue || <span className="text-gray-400 italic">Aucune source</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}