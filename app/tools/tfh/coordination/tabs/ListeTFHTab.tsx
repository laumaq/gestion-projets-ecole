// app/tools/tfh/coordination/tabs/ListeTFHTab.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Eleve } from '../types';
import { ExternalLink, Edit, ChevronDown, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTypesTFH } from '../hooks/useTypesTFH';
import { getIconComponent } from '../utils/constants';
import TypeToggle from '../components/TypeToggle';
import EleveDetailModal from '../components/EleveDetailModal';

interface ListeTFHTabProps {
  eleves: Eleve[];
  onUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
}

type SortField = 'classe' | 'eleve' | 'type' | 'thematique' | 'problematique' | 'categorie';
type RenduFilter = 'all' | 'rendu' | 'non_rendu';
type LienFilter = 'all' | 'avec_lien' | 'sans_lien';

interface SortRule {
  field: SortField;
  direction: 'asc' | 'desc';
}

export default function ListeTFHTab({ eleves, onUpdate, onRefresh }: ListeTFHTabProps) {
  const [editingMode, setEditingMode] = useState(false);
  const [filteredClass, setFilteredClass] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [localEleves, setLocalEleves] = useState<Eleve[]>([]);
  const [renduFilter, setRenduFilter] = useState<RenduFilter>('all');
  const [lienFilter, setLienFilter] = useState<LienFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { field: 'classe', direction: 'asc' },
    { field: 'eleve', direction: 'asc' }
  ]);

  // Types dynamiques depuis tfh_system_settings
  const { typesDisponibles } = useTypesTFH(true);

  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const classesUniques = useMemo(() => 
    Array.from(new Set(eleves.map(e => e.classe || '').filter(c => c))).sort(),
    [eleves]
  );

  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  // ===== Helpers tri =====
  const cleanString = (str: string): string => {
    if (!str) return '';
    return str
      .replace(/^[\s\u00A0\u2000-\u200F\u2028-\u202F]+/, '')
      .replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F]+$/, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const getFieldValue = (eleve: Eleve, field: SortField): string => {
    switch (field) {
      case 'classe': return cleanString(eleve.classe || '');
      case 'eleve': return cleanString(`${eleve.nom} ${eleve.prenom}`).toLowerCase();
      case 'type': return cleanString(eleve.type || '').toLowerCase();
      case 'thematique': return cleanString(eleve.thematique || '');
      case 'problematique': return cleanString(eleve.problematique || '');
      case 'categorie': return cleanString(eleve.categorie || '');
      default: return '';
    }
  };

  const compareValues = (valA: string, valB: string, direction: 'asc' | 'desc'): number => {
    const isEmpty = (v: string) => v === undefined || v === null || v === '';
    const aEmpty = isEmpty(valA);
    const bEmpty = isEmpty(valB);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return direction === 'asc' ? 1 : -1;
    if (bEmpty) return direction === 'asc' ? -1 : 1;
    const comparison = valA.localeCompare(valB);
    return direction === 'asc' ? comparison : -comparison;
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

  const handleSort = (field: SortField) => {
    const currentFirst = sortRules[0];
    if (currentFirst.field === field) {
      const newDirection = currentFirst.direction === 'asc' ? 'desc' : 'asc';
      setSortRules([{ field, direction: newDirection }]);
    } else {
      setSortRules([{ field, direction: 'asc' }]);
    }
  };

  const getSortIcon = (field: SortField) => {
    const firstRule = sortRules[0];
    if (firstRule.field !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline" />;
    return firstRule.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  // ===== Filtrage =====
  // Base filtrée SANS le type → sert à calculer les compteurs contextuels
  const elevesSansFiltreType = useMemo(() => {
    let result = [...localEleves];

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(e =>
        e.nom?.toLowerCase().includes(query) ||
        e.prenom?.toLowerCase().includes(query)
      );
    }
    if (filteredClass !== 'all') {
      result = result.filter(e => e.classe === filteredClass);
    }
    if (renduFilter === 'rendu') {
      result = result.filter(e => e.tfh_non_rendu !== true);
    } else if (renduFilter === 'non_rendu') {
      result = result.filter(e => e.tfh_non_rendu === true);
    }
    if (lienFilter === 'avec_lien') {
      result = result.filter(e => e.url_tfh && e.url_tfh.trim() !== '');
    } else if (lienFilter === 'sans_lien') {
      result = result.filter(e => !e.url_tfh || e.url_tfh.trim() === '');
    }
    return result;
  }, [localEleves, filteredClass, renduFilter, lienFilter, searchQuery]);

  // Compteurs contextuels par type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: elevesSansFiltreType.length };
    typesDisponibles.forEach(t => { counts[t.key] = 0; });
    elevesSansFiltreType.forEach(e => {
      if (e.type && counts[e.type] !== undefined) counts[e.type]++;
    });
    return counts;
  }, [elevesSansFiltreType, typesDisponibles]);

  // Application du filtre type + tri final
  const elevesFiltres = useMemo(() => {
    let result = elevesSansFiltreType;
    if (selectedType !== 'all') {
      result = result.filter(e => e.type === selectedType);
    }
    return sortData(result, sortRules);
  }, [elevesSansFiltreType, selectedType, sortRules]);

  // ===== Édition =====
  const formatNomComplet = (eleve: Eleve) => `${eleve.nom.toUpperCase()} ${eleve.prenom}`;

  const saveField = (eleveId: number, field: string, value: string) => {
    const key = `${eleveId}-${field}`;
    if (saveTimeouts.current[key]) clearTimeout(saveTimeouts.current[key]);
    setSavingFields(prev => new Set(prev).add(key));
    setLocalEleves(prev => prev.map(e =>
      e.student_matricule === eleveId
        ? { ...e, [field]: value === '' ? null : value }
        : e
    ));
    saveTimeouts.current[key] = setTimeout(async () => {
      try {
        await onUpdate(eleveId, field, value === '' ? '' : value);
      } catch (err) {
        console.error('Erreur sauvegarde:', err);
        const original = eleves.find(e => e.student_matricule === eleveId);
        if (original) {
          setLocalEleves(prev => prev.map(e =>
            e.student_matricule === eleveId
              ? { ...e, [field]: original[field as keyof Eleve] }
              : e
          ));
        }
      } finally {
        setSavingFields(prev => {
          const s = new Set(prev); s.delete(key); return s;
        });
        delete saveTimeouts.current[key];
      }
    }, 500);
  };

  const handleClearField = async (eleveId: number, field: string) => {
    const key = `${eleveId}-${field}`;
    if (saveTimeouts.current[key]) {
      clearTimeout(saveTimeouts.current[key]);
      delete saveTimeouts.current[key];
    }
    setLocalEleves(prev => prev.map(e =>
      e.student_matricule === eleveId ? { ...e, [field]: null } : e
    ));
    try {
      await onUpdate(eleveId, field, '');
    } catch (err) {
      console.error('Erreur suppression:', err);
      onRefresh();
    }
  };

  // ===== Rendu cellules =====
  const renderSources = (eleve: Eleve) => {
    const sourceFields = ['source_1', 'source_2', 'source_3', 'source_4', 'source_5'] as const;

    return sourceFields.map((field, idx) => {
      const source = eleve[field] as string | undefined;
      const key = `${eleve.student_matricule}-${field}`;
      const isSaving = savingFields.has(key);

      if (!source || source.trim() === '') {
        return (
          <div key={idx} className="py-0.5 group">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder={`Source ${idx + 1}`}
                value=""
                onChange={(e) => { if (editingMode) saveField(eleve.student_matricule, field, e.target.value); }}
                className={`flex-1 text-xs border rounded px-2 py-1 ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isSaving ? 'opacity-50' : ''}`}
                disabled={!editingMode}
              />
              {isSaving && <span className="text-xs text-gray-400">💾</span>}
            </div>
          </div>
        );
      }

      const isUrl = source.startsWith('http://') || source.startsWith('https://');

      return (
        <div key={idx} className="py-0.5 group">
          <div className="flex items-center justify-between gap-2">
            {isUrl && !editingMode ? (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                title={source}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs truncate">{source}</span>
              </a>
            ) : (
              <input
                type="text"
                value={source}
                onChange={(e) => { if (editingMode) saveField(eleve.student_matricule, field, e.target.value); }}
                className={`flex-1 text-xs border rounded px-2 py-1 ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isSaving ? 'opacity-50' : ''}`}
                disabled={!editingMode}
                title={source.length > 40 ? source : undefined}
              />
            )}
            {editingMode && source && (
              <button
                onClick={() => handleClearField(eleve.student_matricule, field)}
                className="w-6 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Effacer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            {isSaving && <span className="text-xs text-gray-400">💾</span>}
          </div>
        </div>
      );
    });
  };

  const renderEditableCell = (eleve: Eleve, field: keyof Eleve, value: string | undefined) => {
    const displayValue = value || '';
    const key = `${eleve.student_matricule}-${field}`;
    const isSaving = savingFields.has(key);

    if (field === 'problematique') {
      if (!editingMode && eleve.url_tfh) {
        return (
          <div className="text-sm">
            <a href={eleve.url_tfh} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-words">
              {displayValue || '-'}
            </a>
          </div>
        );
      }
      if (!editingMode) {
        return <div className="text-sm whitespace-pre-wrap break-words">{displayValue || '-'}</div>;
      }
      return (
        <div className="relative group">
          <textarea
            value={displayValue}
            onChange={(e) => saveField(eleve.student_matricule, field, e.target.value)}
            className={`w-full text-xs border rounded px-2 py-1 min-h-[120px] ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isSaving ? 'opacity-50' : ''}`}
            disabled={!editingMode}
            placeholder="Problématique..."
            rows={6}
          />
          {isSaving && (
            <div className="absolute -bottom-5 right-0 text-xs text-gray-400 flex items-center gap-1">
              <span>💾</span> Sauvegarde...
            </div>
          )}
          {editingMode && displayValue && (
            <button
              onClick={() => handleClearField(eleve.student_matricule, field)}
              className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Effacer"
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
          onChange={(e) => saveField(eleve.student_matricule, field, e.target.value)}
          className={`w-full text-xs border rounded px-2 py-1 ${editingMode ? 'border-gray-300' : 'border-transparent bg-transparent'} ${isSaving ? 'opacity-50' : ''}`}
          disabled={!editingMode}
          placeholder={
            field === 'classe' ? 'Classe...' :
            field === 'thematique' ? 'Thématique...' :
            field === 'categorie' ? 'Catégorie...' :
            field === 'type' ? 'Type...' : ''
          }
          title={displayValue}
        />
        {isSaving && (
          <div className="absolute -bottom-5 right-0 text-xs text-gray-400 flex items-center gap-1">
            <span>💾</span> Sauvegarde...
          </div>
        )}
        {editingMode && displayValue && (
          <button
            onClick={() => handleClearField(eleve.student_matricule, field)}
            className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Effacer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  // Label dynamique de la colonne Problématique / Titre
  const problematiqueColumnLabel = useMemo(() => {
    if (selectedType === 'all') return 'Problématique / Titre';
    if (selectedType === 'traditionnel') return 'Problématique';
    return 'Titre';
  }, [selectedType]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        {/* Barre supérieure */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Rechercher un élève..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
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

            <div className="ml-auto px-3 py-1.5 bg-violet-100 text-violet-800 rounded-lg font-medium text-sm whitespace-nowrap">
              {elevesFiltres.length} TFH
              {filteredClass !== 'all' && <span className="ml-1">({filteredClass})</span>}
            </div>
          </div>
        </div>

        {/* Filtres - ligne 1 : classe, état, lien */}
        <div className="flex flex-wrap items-center gap-3 w-full mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <label htmlFor="classFilter" className="text-sm font-medium text-gray-700 hidden sm:block">
              Classe:
            </label>
            <div className="relative flex-1">
              <select
                id="classFilter"
                value={filteredClass}
                onChange={(e) => setFilteredClass(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="all">Toutes les classes</option>
                {classesUniques.map((classe) => (
                  <option key={classe} value={classe}>{classe}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <label className="text-sm font-medium text-gray-700">État:</label>
            <div className="relative flex-1">
              <select
                value={renduFilter}
                onChange={(e) => setRenduFilter(e.target.value as RenduFilter)}
                className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="rendu">Rendu</option>
                <option value="non_rendu">Non rendu</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <label className="text-sm font-medium text-gray-700">Lien:</label>
            <div className="relative flex-1">
              <select
                value={lienFilter}
                onChange={(e) => setLienFilter(e.target.value as LienFilter)}
                className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="avec_lien">Avec lien</option>
                <option value="sans_lien">Sans lien</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filtres - ligne 2 : toggle type dynamique */}
        <div className="mb-6">
          <TypeToggle
            types={typesDisponibles}
            selected={selectedType}
            onSelect={setSelectedType}
            counts={typeCounts}
          />
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('classe')}>
                  Classe {getSortIcon('classe')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('eleve')}>
                  Élève {getSortIcon('eleve')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('type')}>
                  Type {getSortIcon('type')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('thematique')}>
                  Thématique {getSortIcon('thematique')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('problematique')}
                >
                  {problematiqueColumnLabel} {getSortIcon('problematique')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sources
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('categorie')}>
                  Catégorie {getSortIcon('categorie')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elevesFiltres.map((eleve) => {
                const typeInfo = typesDisponibles.find(t => t.key === eleve.type);
                const TypeIcon = typeInfo ? getIconComponent(typeInfo.icon) : null;

                return (
                  <tr key={eleve.student_matricule} className={`hover:bg-gray-50 ${eleve.tfh_non_rendu ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {renderEditableCell(eleve, 'classe', eleve.classe || '')}
                    </td>

                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => { if (!editingMode) setSelectedEleve(eleve); }}
                        className={`text-sm font-semibold text-gray-900 text-left ${!editingMode ? 'hover:text-violet-700 hover:underline cursor-pointer' : 'cursor-default'}`}
                        disabled={editingMode}
                      >
                        {formatNomComplet(eleve)}
                      </button>
                      <div className="text-xs text-gray-500">
                        {eleve.guide_nom && eleve.guide_nom !== '-' && `Guide: ${eleve.guide_prenom} ${eleve.guide_nom}`}
                      </div>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      {(() => {
                        if (!editingMode) {
                          if (!typeInfo) {
                            return <span className="text-xs text-gray-400 italic">—</span>;
                          }
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                              {TypeIcon && <TypeIcon className="w-3 h-3" />}
                              {typeInfo.label}
                            </span>
                          );
                        }
                        return (
                          <select
                            value={eleve.type || ''}
                            onChange={(e) => saveField(eleve.student_matricule, 'type', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="">—</option>
                            {typesDisponibles.map(t => (
                              <option key={t.key} value={t.key}>{t.label}</option>
                            ))}
                          </select>
                        );
                      })()}
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
                );
              })}
            </tbody>
          </table>
        </div>

        {elevesFiltres.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">Aucun TFH trouvé</div>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'Aucun élève ne correspond à votre recherche.' :
                filteredClass !== 'all'
                ? `Aucun élève dans la classe ${filteredClass}`
                : selectedType !== 'all'
                ? 'Aucun élève de ce type'
                : 'Les données des élèves apparaîtront ici une fois importées'}
            </p>
          </div>
        )}
      </div>

      {/* Modal détail élève */}
      <EleveDetailModal
        eleve={selectedEleve}
        types={typesDisponibles}
        onClose={() => setSelectedEleve(null)}
      />

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
                <li><strong>Tri</strong> : Cliquez sur les en-têtes de colonnes pour trier (Classe, Élève, Type, Thématique, Problématique, Catégorie)</li>
                <li><strong>Édition</strong> : Activez le mode édition pour modifier les champs</li>
                <li><strong>Détail élève</strong> : Cliquez sur le nom d'un élève pour voir ses infos TFH et son carnet de bord (hors mode édition)</li>
                <li><strong>Filtre par type</strong> : Cliquez sur les boutons colorés pour filtrer par type (les compteurs s'adaptent aux autres filtres)</li>
                <li><strong>Sauvegarde</strong> : Les modifications sont sauvegardées 500ms après la fin de la saisie</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}