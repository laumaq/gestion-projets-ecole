// app/tools/tfh/coordination/tabs/ListeTFHTab.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Eleve } from '../types';
import { ExternalLink, Edit, ChevronDown, Trash2, ArrowUpDown, ArrowUp, ArrowDown, BookOpen, Users, Palette, Hammer } from 'lucide-react';

interface ListeTFHTabProps {
  eleves: Eleve[];
  onUpdate: (eleveId: number, field: string, value: string) => Promise<void>;
  onRefresh: () => void;
}

type SortField = 'classe' | 'eleve' | 'type' | 'thematique' | 'problematique' | 'categorie';
type RenduFilter = 'all' | 'rendu' | 'non_rendu';
type LienFilter = 'all' | 'avec_lien' | 'sans_lien';
type TypeFilter = 'all' | 'mémoire' | 'associatif' | 'artistique' | 'atelier';

interface SortRule {
  field: SortField;
  direction: 'asc' | 'desc';
}

export default function ListeTFHTab({ eleves, onUpdate, onRefresh }: ListeTFHTabProps) {
  const [editingMode, setEditingMode] = useState(false);
  const [filteredClass, setFilteredClass] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [localEleves, setLocalEleves] = useState<Eleve[]>([]);
  const [renduFilter, setRenduFilter] = useState<RenduFilter>('all');
  const [lienFilter, setLienFilter] = useState<LienFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { field: 'classe', direction: 'asc' },
    { field: 'eleve', direction: 'asc' }
  ]);

  // Types de TFH avec leurs icônes et couleurs
  const TFH_TYPES: Record<Exclude<TypeFilter, 'all'>, { icon: React.ReactNode; color: string; label: string }> = {
    mémoire: { icon: <BookOpen className="w-3 h-3" />, color: 'bg-blue-100 text-blue-800', label: 'Mémoire' },
    associatif: { icon: <Users className="w-3 h-3" />, color: 'bg-green-100 text-green-800', label: 'Associatif' },
    artistique: { icon: <Palette className="w-3 h-3" />, color: 'bg-purple-100 text-purple-800', label: 'Artistique' },
    atelier: { icon: <Hammer className="w-3 h-3" />, color: 'bg-orange-100 text-orange-800', label: 'Atelier' },
  };

  const getTypeInfo = (type: string | null | undefined) => {
    if (!type) return { icon: null, color: 'bg-gray-100 text-gray-600', label: '—' };
    return TFH_TYPES[type as Exclude<TypeFilter, 'all'>] || { icon: null, color: 'bg-gray-100 text-gray-600', label: type };
  };

  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const classesUniques = useMemo(() => 
    Array.from(new Set(eleves.map(e => e.classe || '').filter(c => c))).sort(),
    [eleves]
  );

  useEffect(() => {
    setLocalEleves(eleves);
  }, [eleves]);

  const getFieldValue = (eleve: Eleve, field: SortField): string => {
    switch (field) {
      case 'classe':
        return cleanString(eleve.classe || '');
      case 'eleve':
        return cleanString(`${eleve.nom} ${eleve.prenom}`).toLowerCase();
      case 'type':
        return cleanString(eleve.type || '').toLowerCase();
      case 'thematique':
        return cleanString(eleve.thematique || '');
      case 'problematique':
        return cleanString(eleve.problematique || '');
      case 'categorie':
        return cleanString(eleve.categorie || '');
      default:
        return '';
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
    let newDirection: 'asc' | 'desc';
    
    if (currentFirst.field === field) {
      newDirection = currentFirst.direction === 'asc' ? 'desc' : 'asc';
      setSortRules([{ field, direction: newDirection }]);
    } else {
      setSortRules([{ field, direction: 'asc' }]);
    }
  };

  const cleanString = (str: string): string => {
    if (!str) return '';
    return str
      .replace(/^[\s\u00A0\u2000-\u200F\u2028-\u202F]+/, '')
      .replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F]+$/, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const getSortIcon = (field: SortField) => {
    const firstRule = sortRules[0];
    if (firstRule.field !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline" />;
    }
    return firstRule.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const elevesFiltres = useMemo(() => {
    let result = [...localEleves];
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(eleve => 
        eleve.nom?.toLowerCase().includes(query) || 
        eleve.prenom?.toLowerCase().includes(query)
      );
    }
    
    if (filteredClass !== 'all') {
      result = result.filter(e => e.classe === filteredClass);
    }

    if (typeFilter !== 'all') {
      result = result.filter(e => e.type === typeFilter);
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
    
    return sortData(result, sortRules);
  }, [localEleves, filteredClass, typeFilter, renduFilter, lienFilter, searchQuery, sortRules]);

  const formatNomComplet = (eleve: Eleve) => {
    return `${eleve.nom.toUpperCase()} ${eleve.prenom}`;
  };

  const saveField = (eleveId: number, field: string, value: string) => {
    const key = `${eleveId}-${field}`;
    
    if (saveTimeouts.current[key]) {
      clearTimeout(saveTimeouts.current[key]);
    }
    
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
        console.error('Erreur lors de la sauvegarde:', err);
        const originalEleve = eleves.find(e => e.student_matricule === eleveId);
        if (originalEleve) {
          setLocalEleves(prev => prev.map(e => 
            e.student_matricule === eleveId 
              ? { ...e, [field]: originalEleve[field as keyof Eleve] }
              : e
          ));
        }
      } finally {
        setSavingFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
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
      e.student_matricule === eleveId 
        ? { ...e, [field]: null }
        : e
    ));
    
    try {
      await onUpdate(eleveId, field, '');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      onRefresh();
    }
  };

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
                onChange={(e) => {
                  if (editingMode) {
                    saveField(eleve.student_matricule, field, e.target.value);
                  }
                }}
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
            {isUrl ? (
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
                onChange={(e) => {
                  if (editingMode) {
                    saveField(eleve.student_matricule, field, e.target.value);
                  }
                }}
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
            <a
              href={eleve.url_tfh}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-words"
            >
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
            title={displayValue}
            rows={6}
          />
          {isSaving && (
            <div className="absolute -bottom-5 right-0 text-xs text-gray-400 flex items-center gap-1">
              <span>💾</span>
              Sauvegarde...
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
            <span>💾</span>
            Sauvegarde...
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
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
              {typeFilter !== 'all' && (
                <span className="ml-1">
                  {Object.entries(TFH_TYPES).map(([key, val]) => 
                    key === typeFilter && <span key={key}>{val.icon} {val.label}</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full mb-6">
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
                  <option key={classe} value={classe}>
                    {classe}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <label className="text-sm font-medium text-gray-700 hidden sm:block">Type:</label>
            <div className="relative flex-1">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="mémoire">📖 Mémoire</option>
                <option value="associatif">👥 Associatif</option>
                <option value="artistique">🎨 Artistique</option>
                <option value="atelier">🔨 Atelier</option>
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

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('classe')}
                >
                  Classe {getSortIcon('classe')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('eleve')}
                >
                  Élève {getSortIcon('eleve')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  Type {getSortIcon('type')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('thematique')}
                >
                  Thématique {getSortIcon('thematique')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('problematique')}
                >
                  Problématique {getSortIcon('problematique')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sources
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('categorie')}
                >
                  Catégorie {getSortIcon('categorie')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elevesFiltres.map((eleve) => (
                <tr key={eleve.student_matricule} className={`hover:bg-gray-50 ${eleve.tfh_non_rendu ? 'bg-red-50' : ''}`}>
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

                  <td className="px-3 py-3 whitespace-nowrap">
                    {(() => {
                      const typeInfo = getTypeInfo(eleve.type);
                      if (!editingMode) {
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.icon}
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
                          <option value="mémoire">📖 Mémoire</option>
                          <option value="associatif">👥 Associatif</option>
                          <option value="artistique">🎨 Artistique</option>
                          <option value="atelier">🔨 Atelier</option>
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
              ))}
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
                <li><strong>Tri</strong> : Cliquez sur les en-têtes de colonnes pour trier (Classe, Élève, Type, Thématique, Problématique, Catégorie)</li>
                <li><strong>Édition</strong> : Activez le mode édition pour modifier les champs</li>
                <li><strong>Sauvegarde</strong> : Les modifications sont sauvegardées 500ms après la fin de la saisie</li>
                <li><strong>Indicateur</strong> : Une icône 💾 apparaît pendant la sauvegarde</li>
                <li><strong>Sources</strong> : Les URLs sont cliquables et s'ouvrent dans un nouvel onglet</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}