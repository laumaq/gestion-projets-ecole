// app/tools/tfh/coordination/tabs/DocumentsTab/components/EditModal.tsx
'use client';

import { useState } from 'react';
import { X, Save, AlertCircle, FileUp } from 'lucide-react';
import { TfhDocument } from '../../../types';

interface EditModalProps {
  document: TfhDocument;
  onClose: () => void;
  onSubmit: (data: { nom: string; file?: File }) => Promise<void>;
}

const MAX_SIZE = 20 * 1024 * 1024;

export default function EditModal({ document, onClose, onSubmit }: EditModalProps) {
  const [nom, setNom] = useState(document.nom);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nom.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (file && file.size > MAX_SIZE) {
      setError(`Fichier trop volumineux (max 20 Mo).`);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ nom: nom.trim(), file: file || undefined });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Modifier le document</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du document <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <p className="text-xs text-gray-500 mb-1">Fichier actuel :</p>
            <p className="text-sm text-gray-800 font-medium break-all">{document.nom_fichier}</p>
            {document.taille_octets != null && (
              <p className="text-xs text-gray-500">
                {(document.taille_octets / 1024 / 1024).toFixed(2)} Mo
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              Remplacer le fichier (optionnel)
            </label>
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-cyan-50 file:text-cyan-700 file:font-medium hover:file:bg-cyan-100"
            />
            {file && (
              <p className="text-xs text-cyan-700 mt-1">
                Nouveau : {file.name} — {(file.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Laisse vide pour conserver le fichier actuel. Max 20 Mo.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}