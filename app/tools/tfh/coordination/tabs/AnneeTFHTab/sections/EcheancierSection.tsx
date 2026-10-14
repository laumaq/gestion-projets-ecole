// app/tools/tfh/coordination/tabs/AnneeTFHTab/sections/EcheancierSection.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  ListChecks, ChevronDown, ChevronUp,
  Plus, Pencil, Trash2, X, AlertCircle, Check
} from 'lucide-react';
import { useEcheancierCRUD, EcheanceRow, EcheanceInput } from '../hooks/useEcheancierCRUD';
import { useTypesTFH } from '../../../hooks/useTypesTFH';
import { getIconComponent } from '../../../utils/constants';

interface EcheancierSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

interface FormState {
  date: string;
  description: string;
  formats: string[];
}

const EMPTY_FORM: FormState = { date: '', description: '', formats: [] };

export default function EcheancierSection({ expanded, onToggle }: EcheancierSectionProps) {
  const { echeances, loading, createEcheance, updateEcheance, deleteEcheance } = useEcheancierCRUD();
  const { typesDisponibles } = useTypesTFH();

  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const showMessage = (type: 'info' | 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const typesByKey = useMemo(() => {
    const map: Record<string, { label: string; color: string; icon: string }> = {};
    typesDisponibles.forEach(t => {
      map[t.key] = { label: t.label, color: t.color, icon: t.icon };
    });
    return map;
  }, [typesDisponibles]);

  const filteredEcheances = useMemo(() => {
    if (selectedType === null) return echeances;
    return echeances.filter(ech => ech.formats.includes(selectedType));
  }, [echeances, selectedType]);

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (ech: EcheanceRow) => {
    setEditingId(ech.id);
    setForm({
      date: ech.date,
      description: ech.description,
      formats: [...ech.formats],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const toggleFormat = (key: string) => {
    setForm(prev => ({
      ...prev,
      formats: prev.formats.includes(key)
        ? prev.formats.filter(k => k !== key)
        : [...prev.formats, key],
    }));
  };

  const validateForm = (): string | null => {
    if (!form.date) return 'La date est obligatoire.';
    if (!form.description.trim()) return 'La description est obligatoire.';
    if (form.formats.length === 0) return 'Sélectionne au moins un format concerné.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    setSaving(true);
    try {
      const input: EcheanceInput = {
        date: form.date,
        description: form.description.trim(),
        formats: form.formats,
      };

      if (editingId === null) {
        await createEcheance(input);
        showMessage('success', 'Échéance créée.');
      } else {
        await updateEcheance(editingId, input);
        showMessage('success', 'Échéance mise à jour.');
      }

      closeModal();
    } catch (err) {
      console.error('Erreur sauvegarde échéance:', err);
      setFormError('Erreur lors de la sauvegarde. Vérifie la console.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ech: EcheanceRow) => {
    if (!confirm(`Supprimer l'échéance "${ech.description}" du ${formatDate(ech.date)} ?`)) return;
    try {
      await deleteEcheance(ech.id);
      showMessage('info', 'Échéance supprimée.');
    } catch (err) {
      console.error('Erreur suppression échéance:', err);
      showMessage('error', 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
            <ListChecks className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800">Échéancier de travail</h3>
            <p className="text-sm text-gray-500">
              Échéances spécifiques par format de TFH
            </p>
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
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
              message.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
              'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Les échéances encodées ici apparaissent côté élève, filtrées par son format de TFH.
              Les journées de travail et de défense sont injectées automatiquement et ne doivent
              <strong> pas </strong> être encodées ici.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {/* Pills de filtre par type */}
            <button
              onClick={() => setSelectedType(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                selectedType === null
                  ? 'bg-teal-100 text-teal-800 border-teal-200 ring-2 ring-offset-1 ring-teal-400'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {selectedType === null && <Check className="w-3 h-3" />}
              Tous
            </button>

            {typesDisponibles.map(type => {
              const Icon = getIconComponent(type.icon);
              const isActive = selectedType === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => setSelectedType(isActive ? null : type.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    isActive
                      ? `${type.color} ring-2 ring-offset-1 ring-teal-400`
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {isActive ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {type.label}
                </button>
              );
            })}

            <div className="ml-auto">
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter une échéance
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : echeances.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune échéance encodée.</p>
            </div>
          ) : filteredEcheances.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Aucune échéance pour ce format.
              </p>
              <button
                onClick={() => setSelectedType(null)}
                className="mt-3 text-sm text-teal-600 hover:text-teal-800 underline"
              >
                Voir toutes les échéances
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formats concernés</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEcheances.map(ech => (
                    <tr key={ech.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(ech.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {ech.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {ech.formats.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Aucun</span>
                          ) : (
                            ech.formats.map(key => {
                              const type = typesByKey[key];
                              const Icon = type ? getIconComponent(type.icon) : null;
                              const colorClass = type?.color || 'bg-gray-100 text-gray-700 border-gray-200';
                              return (
                                <span
                                  key={key}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${colorClass}`}
                                >
                                  {Icon && <Icon className="w-3 h-3" />}
                                  {type?.label || key}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(ech)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded"
                            title="Éditer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ech)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId === null ? 'Nouvelle échéance' : 'Modifier l\'échéance'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex : Encodage d'une thématique susceptible d'être encore ajustée"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formats concernés <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {typesDisponibles.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Aucun type disponible.</p>
                  ) : (
                    typesDisponibles.map(type => {
                      const Icon = getIconComponent(type.icon);
                      const checked = form.formats.includes(type.key);
                      return (
                        <label
                          key={type.key}
                          className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${
                            checked ? `${type.color} border-current` : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFormat(type.key)}
                            className="w-4 h-4"
                          />
                          {Icon && <Icon className="w-4 h-4" />}
                          <span className="text-sm">{type.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? 'Sauvegarde...' : editingId === null ? 'Créer' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}