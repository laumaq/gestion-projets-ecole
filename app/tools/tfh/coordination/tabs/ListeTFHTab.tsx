// app/tools/tfh/coordination/tabs/ListeTFHTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Eleve } from '../types';
import { ExternalLink, Edit, ChevronDown, Trash2 } from 'lucide-react';

interface ListeTFHTabProps {
  eleves: Eleve[];
  onUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
}

export default function ListeTFHTab({ eleves, onUpdate, onRefresh }: ListeTFHTabProps) {
  const [editingMode, setEditingMode] = useState(false);
  const [filteredClass, setFilteredClass] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  
  const classesUniques = Array.from(new Set(eleves.map(e => e.classe || '').filter(c => c))).sort();
  
  const elevesTries = [...eleves].sort((a, b) => {
    if (a.classe !== b.classe) {
      return (a.classe || '').localeCompare(b.classe || '');
    }
    return a.nom.localeCompare(b.nom);
  });

  useEffect(() => {
    setLocalEleves(elevesTries);
  }, [eleves]);

  const elevesFiltres = filteredClass === 'all' 
    ? localEleves 
    : localEleves.filter(e => e.classe === filteredClass);

  const formatNomComplet = (eleve: Eleve) => {
    return `${eleve.nom.toUpperCase()} ${eleve.prenom}`;
  };

  const handleInstantUpdate = async (eleveId: number, field: string, value: string) => {
    if (!editingMode) return;
    
    try {
      setIsProcessing(eleveId);
      
      setLocalEleves(prev => prev.map(eleve => 
        eleve.student_matricule === eleveId 
          ? { ...eleve, [field]: value === '' ? null : value }
          : eleve
      ));
      
      await onUpdate(eleveId, field, value === '' ? '' : value);
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      onRefresh();
    } finally {
      setIsProcessing(null);
    }
  };

  const handleClearField = (eleveId: number, field: string) => {
    handleInstantUpdate(eleveId, field, '');
  };

  const renderSources = (eleve: Eleve) => {
    const sourceFields = ['source_1', 'source_2', 'source_3', 'source_4', 'source_5'] as const;
    
    return sourceFields.map((field, idx) => {
      const source = eleve[field] as string | undefined;
      const isProcessingField = isProcessing === eleve.student_matricule;
      
      if (!source || source.trim() === '') {
        return (
          <div key={idx} className="py-0.5 group">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder={`Source ${idx + 1}`}
                value=""
                onChange={(e) => handleInstantUpdate(eleve.student_matricule, field, e.target.value)}
                className={`flex-1 text-xs border rounded px-2 py-1 ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isProcessingField ? 'opacity-50' : ''}`}
                disabled={!editingMode || isProcessingField}
              />
              {editingMode && (
                <div className="w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                </div>
              )}
            </div>
          </div>
        );
      }

      const isUrl = source.startsWith('http://') || source.startsWith('https://');
      const displayText = source.length > 40 ? `${source.substring(0, 37)}...` : source;
      
      return (
        <div key={idx} className="py-0.5 group">
          <div className="flex items-center justify-between gap-2">
            {isUrl ? (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                title={source}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <input
                  type="text"
                  value={source}
                  onChange={(e) => handleInstantUpdate(eleve.student_matricule, field, e.target.value)}
                  className={`w-full text-xs border rounded px-2 py-1 min-h-[100px] ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isProcessingField ? 'opacity-50' : ''}`}
                  disabled={!editingMode || isProcessingField}
                  title={source}
                />
              </a>
            ) : (
              <input
                type="text"
                value={source}
                onChange={(e) => handleInstantUpdate(eleve.student_matricule, field, e.target.value)}
                className={`flex-1 text-xs border rounded px-2 py-1 ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isProcessingField ? 'opacity-50' : ''}`}
                disabled={!editingMode || isProcessingField}
                title={source.length > 40 ? source : undefined}
              />
            )}
            
            {editingMode && source && (
              <button
                onClick={() => handleClearField(eleve.student_matricule, field)}
                className="w-6 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Effacer"
                disabled={isProcessingField}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  const renderEditableCell = (eleve: Eleve, field: keyof Eleve, value: string | undefined) => {
    const isProcessingField = isProcessing === eleve.student_matricule;
    const displayValue = value || '';
    
    if (field === 'problematique') {
      return (
        <div className="relative group">
          <textarea
            value={displayValue}
            onChange={(e) => handleInstantUpdate(eleve.student_matricule, field, e.target.value)}
            className={`w-full text-xs border rounded px-2 py-1 min-h-[120px] ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isProcessingField ? 'opacity-50' : ''}`}
            disabled={!editingMode || isProcessingField}
            placeholder="Problématique..."
            title={displayValue}
            rows={6}
          />
          {editingMode && displayValue && (
            <button
              onClick={() => handleClearField(eleve.student_matricule, field)}
              className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Effacer"
              disabled={isProcessingField}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="relative group">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => handleInstantUpdate(eleve.student_matricule, field, e.target.value)}
          className={`w-full text-xs border rounded px-2 py-1 ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isProcessingField ? 'opacity-50' : ''}`}
          disabled={!editingMode || isProcessingField}
          placeholder={
            field === 'classe' ? 'Classe...' : 
            field === 'thematique' ? 'Thématique...' : 
            field === 'categorie' ? 'Catégorie...' : ''
          }
          title={displayValue}
        />
        {editingMode && displayValue && (
          <button
            onClick={() => handleClearField(eleve.student_matricule, field)}
            className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Effacer"
            disabled={isProcessingField}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des TFH</h2>
            <p className="text-gray-600 mt-1">
              Vue d'ensemble de tous les travaux de fin d'humanité
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="classFilter" className="text-sm font-medium text-gray-700">
                Classe:
              </label>
              <div className="relative">
                <select
                  id="classFilter"
                  value={filteredClass}
                  onChange={(e) => setFilteredClass(e.target.value)}
                  className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="all">Toutes</option>
                  {classesUniques.map((classe) => (
                    <option key={classe} value={classe}>
                      {classe}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingMode}
                  onChange={(e) => setEditingMode(e.target.checked)}
                  className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Edit className="w-4 h-4" />
                  Mode édition
                </span>
              </label>
            </div>
            
            <div className="px-3 py-1.5 bg-violet-100 text-violet-800 rounded-lg font-medium text-sm">
              {elevesFiltres.length} TFH{filteredClass !== 'all' ? ` (${filteredClass})` : ''}
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <span className="animate-spin">⟳</span>
              Mise à jour en cours...
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Classe
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  Élève
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Thématique
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  Problématique
                </th> 
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">
                  Sources
                </th> 
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Catégorie
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elevesFiltres.map((eleve) => (
                <tr key={eleve.student_matricule} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {renderEditableCell(eleve, 'classe', eleve.classe || '')}
                  </td>
                  
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNomComplet(eleve)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {eleve.guide_nom && `Guide: ${eleve.guide_prenom} ${eleve.guide_nom}`}
                    </div>
                  </td>
                  
                  <td className="px-3 py-3">
                    <div className="text-sm">
                      {renderEditableCell(eleve, 'thematique', eleve.thematique || '')}
                    </div>
                  </td>
                  
                  <td className="px-3 py-3">
                    <div className="text-sm">
                      {renderEditableCell(eleve, 'problematique', eleve.problematique || '')}
                    </div>
                  </td>
                  
                  <td className="px-3 py-3">
                    <div className="text-sm space-y-1">
                      {renderSources(eleve)}
                    </div>
                  </td>
                  
                  <td className="px-3 py-3">
                    {renderEditableCell(eleve, 'categorie', eleve.categorie || '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {elevesFiltres.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">Aucun TFH trouvé</div>
            <p className="text-gray-500 text-sm">
              {filteredClass !== 'all' 
                ? `Aucun élève dans la classe ${filteredClass}`
                : 'Les données des élèves apparaîtront ici une fois importées'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Mode d'emploi</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Filtre classe</strong> : Sélectionnez une classe pour afficher seulement ses TFH</li>
                <li><strong>Mode édition</strong> : Activez pour modifier tous les champs</li>
                <li><strong>Édition instantanée</strong> : Les modifications sont sauvegardées automatiquement</li>
                <li><strong>Effacer un champ</strong> : Survolez un champ et cliquez sur l'icône 🗑️ pour le vider</li>
                <li><strong>Sources</strong> : Les URLs sont cliquables et s'ouvrent dans un nouvel onglet</li>
                <li><strong>Indicateur</strong> : Un message apparaît pendant la mise à jour en base</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}