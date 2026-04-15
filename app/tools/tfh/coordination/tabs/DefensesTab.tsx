// app/tools/tfh/coordination/tabs/DefensesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eleve, Guide, LecteurExterne, Mediateur } from '../types';
import { formatDateForInput, add50Minutes } from '../utils/dateUtils';
import { getCategoryColor } from '../utils/categoryUtils';

interface DefensesTabProps {
  eleves: Eleve[];
  guides: Guide[];
  lecteursExternes: LecteurExterne[];
  mediateurs: Mediateur[];
  editingMode: boolean;
  onUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onSelectUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
  onSetEditingMode?: (mode: boolean) => void;
}

export default function DefensesTab({
  eleves,
  guides,
  lecteursExternes,
  mediateurs,
  editingMode,
  onUpdate,
  onSelectUpdate,
  onRefresh,
  onSetEditingMode,
}: DefensesTabProps) {
  const [filteredEleves, setFilteredEleves] = useState<Eleve[]>(eleves);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);

  useEffect(() => {
    setLocalEleves(eleves);
    setFilteredEleves(eleves);
  }, [eleves]);

  const handleLocalUpdate = async (eleveId: number, field: string, value: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      await onUpdate(eleveId, field, value);
      
      setLocalEleves(prev => prev.map(eleve => 
        eleve.student_matricule === eleveId 
          ? { ...eleve, [field]: value === '' ? null : value }
          : eleve
      ));
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalSelectUpdate = async (eleveId: number, field: string, value: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      await onSelectUpdate(eleveId, field, value);
      
      setLocalEleves(prev => prev.map(eleve => 
        eleve.student_matricule === eleveId 
          ? { ...eleve, [field]: value === '' ? null : value }
          : eleve
      ));
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryStyle = (categorie: string) => {
    const color = getCategoryColor(categorie);
    return {
      backgroundColor: color.bg,
      borderLeft: `4px solid ${color.border}`,
      color: color.text,
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingMode}
                onChange={(e) => {
                  onSetEditingMode?.(e.target.checked);
                }}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">
                Mode édition défenses
              </span>
            </label>
          </div>
          
          <span className="text-sm text-gray-500">
            ({filteredEleves.length} élève{filteredEleves.length > 1 ? 's' : ''})
          </span>
        </div>
        
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <span className="animate-spin">⟳</span>
              Mise à jour en cours...
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[1400px] md:min-w-full">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Nom</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Prénom</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Classe</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Catégorie</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Problématique</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Guide</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Lecteur Interne</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Lecteur Externe</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Médiateur</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Date Défense</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Heure Défense</th>
                <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">Localisation</th>
              </tr>
            </thead>
            <tbody>
              {localEleves.map((eleve) => {
                const categoryStyle = getCategoryStyle(eleve.categorie || 'Non catégorisé');
                
                return (
                  <tr key={eleve.student_matricule} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">
                      {eleve.nom}
                    </td>
                    
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {eleve.prenom}
                    </td>
                    
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {eleve.classe}
                    </td>
                    
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                        style={categoryStyle}
                      >
                        {eleve.categorie || '-'}
                      </span>
                    </td>
                    
                    <td className="px-3 py-3 text-xs md:text-sm">
                      <div className="whitespace-pre-wrap break-words max-w-xs">
                        {eleve.problematique || '-'}
                      </div>
                    </td>
                    
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      <div className="font-medium">
                        {eleve.guide_nom} {eleve.guide_prenom}
                      </div>
                    </td>
                    
                    {/* Lecteur Interne - sélection parmi les guides (employees) */}
                    <td className="px-3 py-3">
                      <select
                        value={eleve.lecteur_interne_id || ''}
                        onChange={(e) => handleLocalSelectUpdate(eleve.student_matricule, 'lecteur_interne_id', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        disabled={!editingMode || isProcessing}
                      >
                        <option value="">-</option>
                        {guides.map(guide => (
                          <option key={guide.id} value={guide.id}>
                            {guide.nom} {guide.initiale}
                          </option>
                        ))}
                      </select>
                    </td>
                    
                    {/* Lecteur Externe */}
                    <td className="px-3 py-3">
                      <select
                        value={eleve.lecteur_externe_id || ''}
                        onChange={(e) => handleLocalSelectUpdate(eleve.student_matricule, 'lecteur_externe_id', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        disabled={!editingMode || isProcessing}
                      >
                        <option value="">-</option>
                        {lecteursExternes.map(lecteur => (
                          <option key={lecteur.id} value={lecteur.id}>
                            {lecteur.prenom} {lecteur.nom}
                          </option>
                        ))}
                      </select>
                    </td>
                    
                    {/* Médiateur */}
                    <td className="px-3 py-3">
                      <select
                        value={eleve.mediateur_id || ''}
                        onChange={(e) => handleLocalSelectUpdate(eleve.student_matricule, 'mediateur_id', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                        disabled={!editingMode || isProcessing || mediateurs.length === 0}
                      >
                        <option value="">-</option>
                        {mediateurs.map(mediateur => (
                          <option key={mediateur.id} value={mediateur.id}>
                            {mediateur.prenom} {mediateur.nom}
                          </option>
                        ))}
                      </select>
                    </td>   
                                          
                    {/* Date Défense */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={formatDateForInput(eleve.date_defense)}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            handleLocalUpdate(eleve.student_matricule, 'date_defense', newValue);
                          }}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          disabled={!editingMode || isProcessing}
                        />
                        {editingMode && eleve.date_defense && (
                          <button
                            onClick={() => handleLocalUpdate(eleve.student_matricule, 'date_defense', '')}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Effacer la date"
                            disabled={isProcessing}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                                          
                    {/* Heure Défense */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={eleve.heure_defense || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            handleLocalUpdate(eleve.student_matricule, 'heure_defense', newValue);
                          }}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          disabled={!editingMode || isProcessing}
                        />
                        {editingMode && eleve.heure_defense && (
                          <button
                            onClick={() => handleLocalUpdate(eleve.student_matricule, 'heure_defense', '')}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Effacer l'heure"
                            disabled={isProcessing}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                                          
                    {/* Localisation */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={eleve.localisation_defense || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            handleLocalUpdate(eleve.student_matricule, 'localisation_defense', newValue);
                          }}
                          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
                          placeholder="Salle, bâtiment..."
                          disabled={!editingMode || isProcessing}
                        />
                        {editingMode && eleve.localisation_defense && (
                          <button
                            onClick={() => handleLocalUpdate(eleve.student_matricule, 'localisation_defense', '')}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Effacer la localisation"
                            disabled={isProcessing}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Instructions :</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Activez le <strong>Mode édition</strong> pour modifier les défenses</li>
          <li>• Sélectionnez un <strong>lecteur interne</strong> parmi les guides disponibles</li>
          <li>• Sélectionnez un <strong>lecteur externe</strong> parmi la liste</li>
          <li>• Cliquez sur <strong>×</strong> pour effacer une date/heure/localisation</li>
          <li>• Les catégories sont colorées pour une meilleure visibilité</li>
        </ul>
      </div>
    </div>
  );
}