// app/tools/tfh/coordination/tabs/DefensesTab.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Eleve, Guide, Externe } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import { getCategoryColor } from '../utils/categoryUtils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useDefenseConflicts } from '../hooks/useDefenseConflicts';

interface DefensesTabProps {
  eleves: Eleve[];
  guides: Guide[];
  externes: Externe[];
  editingMode: boolean;
  onUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onSelectUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
  onSetEditingMode?: (mode: boolean) => void;
}

type SortField = 
  | 'classe'
  | 'nom'
  | 'prenom'
  | 'categorie'
  | 'problematique'
  | 'guide_nom'
  | 'guide_prenom'
  | 'lecteur_interne_id'
  | 'lecteur_externe_id'
  | 'mediateur_id'
  | 'date_defense'
  | 'heure_defense'
  | 'localisation_defense'
  | 'tfh_non_rendu';

interface SortRule {
  field: SortField;
  direction: 'asc' | 'desc';
}

export default function DefensesTab({
  eleves,
  guides,
  externes,
  editingMode,
  onUpdate,
  onSelectUpdate,
  onRefresh,
  onSetEditingMode,
}: DefensesTabProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localEleves, setLocalEleves] = useState<Eleve[]>(eleves);
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { field: 'classe', direction: 'asc' },
    { field: 'nom', direction: 'asc' }
  ]);
  const [hideWithoutGuide, setHideWithoutGuide] = useState(true);
  const [showOnlyIncompleteJury, setShowOnlyIncompleteJury] = useState(false);
  const [renduFilter, setRenduFilter] = useState<'all' | 'rendu' | 'non_rendu'>('all');

  const conflictCache = useDefenseConflicts(localEleves, guides, externes);

  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  const getFieldValue = (eleve: Eleve, field: SortField): any => {
    const trimStr = (s: string | null | undefined) => (s || '').trim();
    switch (field) {
      case 'classe': return trimStr(eleve.classe);
      case 'nom': return trimStr(eleve.nom);
      case 'prenom': return trimStr(eleve.prenom);
      case 'categorie': return trimStr(eleve.categorie);
      case 'problematique': return trimStr(eleve.problematique);
      case 'guide_nom': {
        if (!eleve.guide_id || eleve.guide_id.trim() === '') return '';
        return `${trimStr(eleve.guide_nom)} ${trimStr(eleve.guide_prenom)}`;
      }
      case 'guide_prenom': return trimStr(eleve.guide_prenom);
      case 'lecteur_interne_id': {
        const guide = guides.find(g => g.id === eleve.lecteur_interne_id);
        return guide ? `${guide.nom} ${guide.initiale}.` : '';
      }
      case 'lecteur_externe_id': {
        const externe = externes.find(l => l.lecteur_externe_id === eleve.lecteur_externe_id);
        return externe ? `${externe.nom} ${externe.prenom}` : '';
      }
      case 'mediateur_id': {
        const externe = externes.find(m => m.mediateur_id === eleve.mediateur_id);
        return externe ? `${externe.nom} ${externe.prenom}` : '';
      }
      case 'date_defense':
        return eleve.date_defense ? new Date(eleve.date_defense).getTime() : null;
      case 'heure_defense': return trimStr(eleve.heure_defense);
      case 'localisation_defense': return trimStr(eleve.localisation_defense);
      case 'tfh_non_rendu': return eleve.tfh_non_rendu === true ? 1 : 0;
      default: return '';
    }
  };
  
  const compareValues = (valA: any, valB: any, direction: 'asc' | 'desc'): number => {
    const isEmpty = (v: any) => {
      if (v === null || v === undefined) return true;
      if (typeof v === 'string') return v.trim() === '';
      return false;
    };
    const aEmpty = isEmpty(valA);
    const bEmpty = isEmpty(valB);
  
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return direction === 'asc' ? 1 : -1;
    if (bEmpty) return direction === 'asc' ? -1 : 1;
  
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  };
  
  const handleSort = (field: SortField) => {
    const currentFirst = sortRules[0];
    let newDirection: 'asc' | 'desc';
    if (currentFirst.field === field) {
      newDirection = currentFirst.direction === 'asc' ? 'desc' : 'asc';
    } else {
      newDirection = 'asc';
    }
    
    let secondaryRules: SortRule[] = [
      { field: 'classe', direction: 'asc' },
      { field: 'nom', direction: 'asc' },
      { field: 'prenom', direction: 'asc' }
    ];
    
    if (field === 'guide_nom') {
      secondaryRules = [
        { field: 'classe', direction: 'asc' },
        { field: 'guide_prenom', direction: 'asc' },
        { field: 'nom', direction: 'asc' },
        { field: 'prenom', direction: 'asc' }
      ];
    }
    
    let filteredSecondary = secondaryRules.filter(r => r.field !== field);
    
    setSortRules([
      { field, direction: newDirection },
      ...filteredSecondary
    ]);
  };

  const sortData = (data: Eleve[], rules: SortRule[]): Eleve[] => {
    return [...data].sort((a, b) => {
      for (const rule of rules) {
        const valA = getFieldValue(a, rule.field);
        const valB = getFieldValue(b, rule.field);
        const cmp = compareValues(valA, valB, rule.direction);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  };

  const filteredAndSortedEleves = useMemo(() => {
    let result = [...localEleves];
    
    if (renduFilter === 'rendu') {
      result = result.filter(e => e.tfh_non_rendu !== true);
    } else if (renduFilter === 'non_rendu') {
      result = result.filter(e => e.tfh_non_rendu === true);
    }
    
    if (hideWithoutGuide) {
      result = result.filter(e => e.guide_id && e.guide_id.trim() !== '');
    }
    if (showOnlyIncompleteJury) {
      result = result.filter(e => {
        const hasGuide = e.guide_id && e.guide_id.trim() !== '';
        const hasLecteurInterne = e.lecteur_interne_id && e.lecteur_interne_id.trim() !== '';
        const hasLecteurExterne = e.lecteur_externe_id && e.lecteur_externe_id.trim() !== '';
        const hasMediateur = e.mediateur_id && e.mediateur_id.trim() !== '';
        const juryComplet = hasGuide && hasLecteurInterne && hasLecteurExterne && hasMediateur;
        return !juryComplet;
      });
    }
    return sortData(result, sortRules);
  }, [localEleves, hideWithoutGuide, showOnlyIncompleteJury, sortRules, renduFilter]);

  const getSortIcon = (field: SortField) => {
    const firstRule = sortRules[0];
    if (firstRule.field !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline" />;
    return firstRule.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const handleLocalUpdate = async (eleveId: number, field: string, value: string) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await onUpdate(eleveId, field, value);
      setLocalEleves(prev => prev.map(eleve =>
        eleve.student_matricule === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
      ));
    } catch (err) {
      console.error('Erreur handleLocalUpdate:', err);
      // Ne pas appeler onRefresh ici pour éviter le rechargement
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalSelectUpdate = async (eleveId: number, field: string, value: string) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await onSelectUpdate(eleveId, field, value);
      // Mettre à jour localement
      setLocalEleves(prev => prev.map(eleve =>
        eleve.student_matricule === eleveId ? { ...eleve, [field]: value === '' ? null : value } : eleve
      ));
    } catch (err) {
      console.error('Erreur handleLocalSelectUpdate:', err);
      // Ne pas appeler onRefresh ici pour éviter le rechargement
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

  const getAllOptions = useCallback((
    type: 'lecteur_interne' | 'lecteur_externe' | 'mediateur'
  ): { id: string; label: string; type: 'guide' | 'externe' }[] => {
    if (type === 'lecteur_interne') {
      return guides.map(g => ({
        id: g.id,
        label: `${g.nom} ${g.initiale}.`,
        type: 'guide' as const
      }));
    } else {
      return externes
        .filter(e => type === 'lecteur_externe' ? e.lecteur_externe_id : e.mediateur_id)
        .map(e => ({
          id: type === 'lecteur_externe' ? e.lecteur_externe_id! : e.mediateur_id!,
          label: `${e.nom} ${e.prenom}`,
          type: 'externe' as const
        }));
    }
  }, [guides, externes]);

  const getAvailableOptions = useCallback((
    type: 'lecteur_interne' | 'lecteur_externe' | 'mediateur',
    currentEleve: Eleve
  ): { id: string; label: string }[] => {
    if (!currentEleve.date_defense?.trim() || !currentEleve.heure_defense?.trim()) {
      return getAllOptions(type).map(opt => ({ id: opt.id, label: opt.label }));
    }

    const slotKey = `${currentEleve.date_defense}_${currentEleve.heure_defense}`;
    const conflicts = conflictCache[slotKey];

    if (!conflicts) {
      return getAllOptions(type).map(opt => ({ id: opt.id, label: opt.label }));
    }

    const { occupiedGuideIds, occupiedExterneIds } = conflicts;

    const currentAssignment = (() => {
      if (type === 'lecteur_interne') return currentEleve.lecteur_interne_id;
      if (type === 'lecteur_externe') return currentEleve.lecteur_externe_id;
      return currentEleve.mediateur_id;
    })();

    const allOptions = getAllOptions(type);
    
    const filtered = allOptions.filter(opt => {
      if (opt.id === currentAssignment) return true;

      if (opt.type === 'guide') {
        return !occupiedGuideIds.has(opt.id);
      } else {
        const externe = externes.find(e => {
          if (type === 'lecteur_externe') {
            return e.lecteur_externe_id === opt.id;
          } else {
            return e.mediateur_id === opt.id;
          }
        });
        
        if (externe) {
          return !occupiedExterneIds.has(externe.id);
        }
        return true;
      }
    });

    return filtered
      .map(opt => ({ id: opt.id, label: opt.label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [conflictCache, externes, guides, getAllOptions]);

  const isGuideAccepteNumerique = (guideId: string | null | undefined): boolean => {
    if (!guideId) return false;
    const guide = guides.find(g => g.id === guideId);
    return guide?.tfh_accepte_numerique === true;
  };
  
  const isExterneAccepteNumerique = (externeId: string | null | undefined): boolean => {
    if (!externeId) return false;
    const externe = externes.find(e => 
      e.lecteur_externe_id === externeId || e.mediateur_id === externeId
    );
    return externe?.tfh_accepte_numerique === true;
  };

  const renderSelectOrLabel = (
    eleve: Eleve,
    field: 'lecteur_interne_id' | 'lecteur_externe_id' | 'mediateur_id',
    type: 'lecteur_interne' | 'lecteur_externe' | 'mediateur',
    getCurrentLabel: () => string
  ) => {
    const currentId = eleve[field] || '';
    const currentLabel = getCurrentLabel();
    
    const availableOptions = getAvailableOptions(type, eleve);
    
    if (!editingMode) {
      return <div className="text-xs md:text-sm">{currentLabel || '-'}</div>;
    }

    return (
      <select
        value={currentId}
        onChange={(e) => handleLocalSelectUpdate(eleve.student_matricule, field, e.target.value)}
        className="w-full border rounded px-2 py-1 text-xs md:text-sm"
        disabled={isProcessing}
      >
        <option value="">-</option>
        {availableOptions.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  };

  const renderInputOrLabel = (
    eleve: Eleve,
    field: 'date_defense' | 'heure_defense' | 'localisation_defense',
    type: 'date' | 'time' | 'text',
    value: string,
    placeholder?: string
  ) => {
    if (!editingMode) {
      if (field === 'date_defense' && value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return <div>{d.toLocaleDateString('fr-FR')}</div>;
      }
      return <div>{value || '-'}</div>;
    }

    return (
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={type === 'date' ? formatDateForInput(value) : value}
          onChange={(e) => handleLocalUpdate(eleve.student_matricule, field, e.target.value)}
          className="w-full border rounded px-2 py-1 text-xs md:text-sm"
          placeholder={placeholder}
          disabled={isProcessing}
        />
        {editingMode && value && (
          <button
            onClick={() => handleLocalUpdate(eleve.student_matricule, field, '')}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            title="Effacer"
            disabled={isProcessing}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingMode}
                onChange={(e) => onSetEditingMode?.(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">Mode édition défenses</span>
            </label>
            <div className="h-6 w-px bg-gray-300 hidden md:block" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideWithoutGuide}
                onChange={(e) => setHideWithoutGuide(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Masquer les TFH sans guide</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyIncompleteJury}
                onChange={(e) => setShowOnlyIncompleteJury(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Uniquement les jurys incomplets</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">État TFH :</span>
            <div className="flex gap-1">
              <button
                onClick={() => setRenduFilter('all')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  renduFilter === 'all' ? 'bg-blue-100 text-blue-800 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setRenduFilter('rendu')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  renduFilter === 'rendu' ? 'bg-green-100 text-green-800 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Rendu
              </button>
              <button
                onClick={() => setRenduFilter('non_rendu')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  renduFilter === 'non_rendu' ? 'bg-red-100 text-red-800 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Non rendu
              </button>
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {filteredAndSortedEleves.length} / {localEleves.length} élève{filteredAndSortedEleves.length > 1 ? 's' : ''}
          </span>
        </div>
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <span className="animate-spin">⟳</span> Mise à jour en cours...
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[1400px] md:min-w-full">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th onClick={() => handleSort('tfh_non_rendu')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Non rendu {getSortIcon('tfh_non_rendu')}
                </th>
                <th onClick={() => handleSort('classe')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Classe {getSortIcon('classe')}
                </th>
                <th onClick={() => handleSort('nom')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Élève {getSortIcon('nom')}
                </th>
                <th onClick={() => handleSort('categorie')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Catégorie {getSortIcon('categorie')}
                </th>
                <th onClick={() => handleSort('problematique')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Problématique {getSortIcon('problematique')}
                </th>
                <th onClick={() => handleSort('guide_nom')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Guide {getSortIcon('guide_nom')}
                </th>
                <th onClick={() => handleSort('lecteur_interne_id')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Lecteur Interne {getSortIcon('lecteur_interne_id')}
                </th>
                <th onClick={() => handleSort('lecteur_externe_id')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Lecteur Externe {getSortIcon('lecteur_externe_id')}
                </th>
                <th onClick={() => handleSort('mediateur_id')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Médiateur {getSortIcon('mediateur_id')}
                </th>
                <th onClick={() => handleSort('date_defense')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Date Défense {getSortIcon('date_defense')}
                </th>
                <th onClick={() => handleSort('heure_defense')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Heure Défense {getSortIcon('heure_defense')}
                </th>
                <th onClick={() => handleSort('localisation_defense')} className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                  Localisation {getSortIcon('localisation_defense')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEleves.map((eleve) => {
                const categoryStyle = getCategoryStyle(eleve.categorie || 'Non catégorisé');
                const lecteurInterneLabel = guides.find(g => g.id === eleve.lecteur_interne_id)
                  ? `${guides.find(g => g.id === eleve.lecteur_interne_id)!.nom} ${guides.find(g => g.id === eleve.lecteur_interne_id)!.initiale}.`
                  : '';
                const lecteurExterneLabel = externes.find(e => e.lecteur_externe_id === eleve.lecteur_externe_id)
                  ? `${externes.find(e => e.lecteur_externe_id === eleve.lecteur_externe_id)!.nom} ${externes.find(e => e.lecteur_externe_id === eleve.lecteur_externe_id)!.prenom}`
                  : '';
                
                const mediateurLabel = (() => {
                  if (!eleve.mediateur_id) return '';
                  const found = externes.find(e => e.mediateur_id === eleve.mediateur_id);
                  return found ? `${found.nom} ${found.prenom}` : '';
                })();

                return (
                  <tr key={eleve.student_matricule} className={`border-b hover:bg-gray-50 ${eleve.tfh_non_rendu ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={eleve.tfh_non_rendu === true}
                        onChange={(e) => handleLocalUpdate(eleve.student_matricule, 'tfh_non_rendu', e.target.checked ? 'true' : 'false')}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        disabled={!editingMode || isProcessing}
                      />
                    </td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">{eleve.classe || '-'}</td>
                    <td className="px-3 py-3 text-xs md:text-sm font-medium whitespace-nowrap">
                      {eleve.nom ? `${eleve.nom.toUpperCase()} ${eleve.prenom}` : eleve.prenom || '-'}
                    </td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={categoryStyle}>
                        {eleve.categorie || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs md:text-sm max-w-xs break-words">{eleve.problematique || '-'}</td>
                    <td className="px-3 py-3 text-xs md:text-sm whitespace-nowrap">
                      {eleve.guide_id ? (
                        <span className={isGuideAccepteNumerique(eleve.guide_id) ? 'text-blue-600 font-medium' : ''}>
                          {eleve.guide_nom} {eleve.guide_prenom}
                        </span>
                      ) : '-'}
                    </td>
                    
                    <td className="px-3 py-3">
                      {!editingMode ? (
                        <span className={isGuideAccepteNumerique(eleve.lecteur_interne_id) ? 'text-blue-600 font-medium' : ''}>
                          {lecteurInterneLabel || '-'}
                        </span>
                      ) : (
                        renderSelectOrLabel(eleve, 'lecteur_interne_id', 'lecteur_interne', () => lecteurInterneLabel)
                      )}
                    </td>
                    
                    <td className="px-3 py-3">
                      {!editingMode ? (
                        <span className={isExterneAccepteNumerique(eleve.lecteur_externe_id) ? 'text-blue-600 font-medium' : ''}>
                          {lecteurExterneLabel || '-'}
                        </span>
                      ) : (
                        renderSelectOrLabel(eleve, 'lecteur_externe_id', 'lecteur_externe', () => lecteurExterneLabel)
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {!editingMode ? (
                        <span className={isExterneAccepteNumerique(eleve.mediateur_id) ? 'text-blue-600 font-medium' : ''}>
                          {mediateurLabel || '-'}
                        </span>
                      ) : (
                        renderSelectOrLabel(eleve, 'mediateur_id', 'mediateur', () => mediateurLabel)
                      )}
                    </td>

                    <td className="px-3 py-3">{renderInputOrLabel(eleve, 'date_defense', 'date', eleve.date_defense || '')}</td>
                    <td className="px-3 py-3">{renderInputOrLabel(eleve, 'heure_defense', 'time', eleve.heure_defense || '')}</td>
                    <td className="px-3 py-3">{renderInputOrLabel(eleve, 'localisation_defense', 'text', eleve.localisation_defense || '', 'Salle, bâtiment...')}</td>
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
          <li>• Cliquez sur les entêtes pour trier (la colonne choisie passe en premier, puis classe, puis nom).</li>
          <li>• Activez le <strong>Mode édition</strong> pour modifier les défenses.</li>
          <li>• Les filtres permettent de masquer les élèves sans guide ou de n'afficher que les jurys incomplets.</li>
          <li>• Un jury est complet si guide, lecteur interne, lecteur externe et médiateur sont assignés.</li>
          <li>• Les noms en <span className="text-blue-600 font-medium">bleu</span> indiquent que la personne accepte le numérique.</li>
          <li>• Cliquez sur <strong>×</strong> pour effacer une date/heure/localisation.</li>
        </ul>
      </div>
    </div>
  );
}