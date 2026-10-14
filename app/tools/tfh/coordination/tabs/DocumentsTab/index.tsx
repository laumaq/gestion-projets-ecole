// app/tools/tfh/coordination/tabs/DocumentsTab/index.tsx
'use client';

import { useState } from 'react';
import {
  FolderOpen, Plus, Pencil, Trash2,
  Download, AlertCircle, FileText
} from 'lucide-react';
import { useDocumentsCRUD } from './hooks/useDocumentsCRUD';
import UploadModal from './components/UploadModal';
import EditModal from './components/EditModal';
import { TfhDocument } from '../../types';

export default function DocumentsTab() {
  const { documents, loading, createDocument, updateDocument, deleteDocument } = useDocumentsCRUD();

  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TfhDocument | null>(null);

  const showMessage = (type: 'info' | 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreate = async (data: { nom: string; file: File }) => {
    try {
      await createDocument(data);
      showMessage('success', 'Document ajouté.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Erreur lors de l\'ajout.');
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: { nom: string; file?: File }) => {
    try {
      await updateDocument(id, data);
      showMessage('success', 'Document mis à jour.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Erreur lors de la mise à jour.');
      throw err;
    }
  };

  const handleDelete = async (doc: TfhDocument) => {
    if (!confirm(`Supprimer définitivement "${doc.nom}" ?\nCette action supprime aussi le fichier.`)) return;
    try {
      await deleteDocument(doc.id);
      showMessage('info', 'Document supprimé.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Erreur lors de la suppression.');
    }
  };

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Documents TFH</h2>
              <p className="text-sm text-gray-500">
                Documents génériques accessibles à tous (modèles, conventions, grilles…)
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un document
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          message.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
          'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-white">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aucun document pour le moment.</p>
          <button
            onClick={() => setUploadOpen(true)}
            className="mt-3 text-sm text-cyan-600 hover:text-cyan-800 underline"
          >
            Ajouter le premier document
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fichier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Taille</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ajouté le</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {doc.nom}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="break-all">{doc.nom_fichier}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatSize(doc.taille_octets)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-1">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setEditingDoc(doc)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
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

      {/* Modals */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingDoc && (
        <EditModal
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={(data) => handleUpdate(editingDoc.id, data)}
        />
      )}
    </div>
  );
}