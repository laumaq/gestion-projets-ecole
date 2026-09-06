// app/tools/tfh/coordination/tabs/ParametresTab/sections/SectionTypesTFH.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, Plus, Trash2, Save, Edit2, X,
  BookOpen, Users, Palette, Hammer, Info
} from 'lucide-react';
import { TypeTFH, useTypesTFH } from '../hooks/useTypesTFH';
import EditeurTexte from '@/components/EditeurTexte';

interface SectionTypesTFHProps {
  expanded: boolean;
  onToggle: () => void;
}

// Mapping des noms d'icônes vers les composants Lucide
const ICON_MAP: Record<string, any> = {
  BookOpen: BookOpen,
  Users: Users,
  Palette: Palette,
  Hammer: Hammer,
};

const COLOR_OPTIONS = [
  { value: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Bleu' },
  { value: 'bg-green-100 text-green-800 border-green-200', label: 'Vert' },
  { value: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Violet' },
  { value: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Orange' },
  { value: 'bg-red-100 text-red-800 border-red-200', label: 'Rouge' },
  { value: 'bg-pink-100 text-pink-800 border-pink-200', label: 'Rose' },
  { value: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Indigo' },
  { value: 'bg-teal-100 text-teal-800 border-teal-200', label: 'Teal' },
  { value: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Gris' },
];

const ICON_OPTIONS = [
  { value: 'BookOpen', label: '📖 Livre' },
  { value: 'Users', label: '👥 Groupe' },
  { value: 'Palette', label: '🎨 Palette' },
  { value: 'Hammer', label: '🔨 Marteau' },
  { value: 'GraduationCap', label: '🎓 Diplôme' },
  { value: 'Target', label: '🎯 Cible' },
  { value: 'Sparkles', label: '✨ Étincelles' },
  { value: 'Globe', label: '🌍 Globe' },
];

export default function SectionTypesTFH({ expanded, onToggle }: SectionTypesTFHProps) {
  const { types, loading, saving, saveType, addType, deleteType } = useTypesTFH();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTypeKey, setNewTypeKey] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editedTypes, setEditedTypes] = useState<Record<string, TypeTFH>>({});

  // Initialiser les types édités quand les types chargent
  useEffect(() => {
    const initial: Record<string, TypeTFH> = {};
    types.forEach(t => {
      initial[t.key] = { ...t };
    });
    setEditedTypes(initial);
  }, [types]);

  const stopPropagation = (e: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleEditClick = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(key);
    // Initialiser les valeurs éditées
    const type = types.find(t => t.key === key);
    if (type) {
      setEditedTypes(prev => ({
        ...prev,
        [key]: { ...type }
      }));
    }
  };

  const handleFieldChange = (key: string, field: keyof TypeTFH, value: any) => {
    setEditedTypes(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleSaveType = async (key: string) => {
    const typeToSave = editedTypes[key];
    if (!typeToSave) return;
    
    const success = await saveType(typeToSave);
    if (success) {
      setEditingId(null);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteType = async (typeKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Supprimer le type "${typeKey}" ? Cette action est irréversible.`)) {
      await deleteType(typeKey);
    }
  };

  const handleAddType = async () => {
    if (!newTypeKey.trim() || !newTypeLabel.trim()) return;
    
    const key = newTypeKey.trim().toLowerCase().replace(/\s+/g, '_');
    const success = await addType(key, newTypeLabel.trim());
    if (success) {
      setNewTypeKey('');
      setNewTypeLabel('');
      setShowAddForm(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || BookOpen;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800">Types de TFH</h3>
            <p className="text-sm text-gray-500">Gestion des formats de TFH disponibles</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {types.map((type) => {
                  const Icon = getIconComponent(type.icon);
                  const isEditing = editingId === type.key;
                  const edited = editedTypes[type.key] || type;

                  return (
                    <div 
                      key={type.key} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      onClick={stopPropagation}
                    >
                      {isEditing ? (
                        // Mode édition - On empêche la propagation sur TOUS les clics
                        <div 
                          className="space-y-4" 
                          onClick={stopPropagation}
                          onMouseDown={stopPropagation}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Label *
                              </label>
                              <input
                                type="text"
                                value={edited.label || ''}
                                onChange={(e) => {
                                  stopPropagation(e);
                                  handleFieldChange(type.key, 'label', e.target.value);
                                }}
                                onClick={stopPropagation}
                                onMouseDown={stopPropagation}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ex: Mémoire"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Icône
                              </label>
                              <select
                                value={edited.icon || 'BookOpen'}
                                onChange={(e) => {
                                  stopPropagation(e);
                                  handleFieldChange(type.key, 'icon', e.target.value);
                                }}
                                onClick={stopPropagation}
                                onMouseDown={stopPropagation}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                {ICON_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Couleur
                              </label>
                              <select
                                value={edited.color || COLOR_OPTIONS[0].value}
                                onChange={(e) => {
                                  stopPropagation(e);
                                  handleFieldChange(type.key, 'color', e.target.value);
                                }}
                                onClick={stopPropagation}
                                onMouseDown={stopPropagation}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                {COLOR_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end justify-end gap-2">
                              <button
                                onClick={handleCancelEdit}
                                onMouseDown={stopPropagation}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveType(type.key);
                                }}
                                onMouseDown={stopPropagation}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                disabled={saving}
                              >
                                <Save className="w-4 h-4" />
                                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <div onClick={stopPropagation} onMouseDown={stopPropagation}>
                              <EditeurTexte
                                value={edited.description || ''}
                                onChange={(value) => {
                                  handleFieldChange(type.key, 'description', value);
                                }}
                                placeholder="Description détaillée du format..."
                                hauteur="h-96"
                                simple={false}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Mode visualisation
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${type.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">{type.label}</h4>
                              <p className="text-sm text-gray-500 line-clamp-2 max-w-md">
                                {type.description ? 
                                  type.description.replace(/<[^>]*>/g, '').substring(0, 100) + (type.description.replace(/<[^>]*>/g, '').length > 100 ? '...' : '') : 
                                  'Aucune description'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleEditClick(type.key, e)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {types.length > 1 && (
                              <button
                                onClick={(e) => handleDeleteType(type.key, e)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ajouter un nouveau type */}
              {showAddForm ? (
                <div 
                  className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-4"
                  onClick={stopPropagation}
                  onMouseDown={stopPropagation}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Label *
                      </label>
                      <input
                        type="text"
                        value={newTypeLabel}
                        onChange={(e) => {
                          stopPropagation(e);
                          setNewTypeLabel(e.target.value);
                          // Générer automatiquement la clé à partir du label
                          const generatedKey = e.target.value.toLowerCase().replace(/\s+/g, '_');
                          setNewTypeKey(generatedKey);
                        }}
                        onClick={stopPropagation}
                        onMouseDown={stopPropagation}
                        placeholder="Ex: Stage"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clé (générée automatiquement)
                      </label>
                      <input
                        type="text"
                        value={newTypeKey}
                        onClick={stopPropagation}
                        onMouseDown={stopPropagation}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddForm(false);
                        setNewTypeKey('');
                        setNewTypeLabel('');
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddType();
                      }}
                      disabled={!newTypeLabel.trim() || saving}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddForm(true);
                  }}
                  className="mt-4 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un type de TFH
                </button>
              )}

              <div 
                className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                onClick={stopPropagation}
              >
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Comment ça fonctionne ?</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Les types de TFH définis ici apparaissent automatiquement dans la page élève</li>
                      <li>Chaque type peut avoir une icône, une couleur et une description détaillée</li>
                      <li>La description supporte le formatage HTML (gras, listes, etc.)</li>
                      <li>Les élèves peuvent choisir leur type pendant la phase préparatoire</li>
                      <li>Les coordinateurs voient les types dans la liste des TFH</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
