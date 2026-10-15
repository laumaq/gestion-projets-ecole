// app/tools/tfh/coordination/tabs/DocumentsTab/index.tsx
'use client';

import { useState } from 'react';
import {
  FolderOpen, Plus, Pencil, Trash2,
  Download, FileText
} from 'lucide-react';
import StateCycleCheckbox from '@/components/StateCycleCheckbox';
import { useDocumentsCRUD } from './hooks/useDocumentsCRUD';
import { TfhDocumentValidationStatus } from './hooks/useDocumentsCRUD';
import UploadModal from './components/UploadModal';
import EditModal from './components/EditModal';
import { TfhDocument } from '../../types';

export default function DocumentsTab() {
  const {
    documents,
    recipients,
    loading,
    loadError,
    createDocument,
    updateDocument,
    updateRecipients,
    updateSubmissionStatus,
    deleteDocument,
  } = useDocumentsCRUD();

  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TfhDocument | null>(null);
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null);
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<string | null>(null);

  const validationOptions = [
    {
      value: 'pending',
      label: 'En attente de validation',
      symbol: '…',
      className: 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200',
    },
    {
      value: 'validated',
      label: 'Validé',
      symbol: '✓',
      className: 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200',
    },
    {
      value: 'rejected',
      label: 'Rejeté',
      symbol: '✕',
      className: 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200',
    },
  ] as const;

  const showMessage = (type: 'info' | 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreate = async (data: Parameters<typeof createDocument>[0]) => {
    try {
      await createDocument(data);
      showMessage('success', 'Document ajouté.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Erreur lors de l\'ajout.');
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: Parameters<typeof updateDocument>[1]) => {
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

  const parentDocuments = documents.filter(document => !document.document_parent_id);
  const getSubmissions = (documentId: string) =>
    documents.filter(document => document.document_parent_id === documentId);

  const sortRecipients = (students: typeof recipients) =>
    [...students].sort((a, b) =>
      a.classe.localeCompare(b.classe, 'fr', { sensitivity: 'base' }) ||
      a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }) ||
      a.prenom.localeCompare(b.prenom, 'fr', { sensitivity: 'base' })
    );

  const handleToggleRecipient = async (document: TfhDocument, matricule: number) => {
    const currentIds = document.destinataires_matricules || [];
    const nextIds = currentIds.includes(matricule)
      ? currentIds.filter(id => id !== matricule)
      : [...currentIds, matricule];
    try {
      await updateRecipients(document.id, nextIds);
    } catch (err: any) {
      showMessage('error', err?.message || 'Erreur lors de la mise à jour des destinataires.');
    }
  };

  const handleValidationStatusChange = async (
    submission: TfhDocument,
    status: TfhDocumentValidationStatus
  ) => {
    setUpdatingSubmissionId(submission.id);
    try {
      await updateSubmissionStatus(submission.id, status);
    } catch (err: any) {
      showMessage('error', err?.message || 'Erreur lors de la mise à jour de la validation.');
    } finally {
      setUpdatingSubmissionId(null);
    }
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
                Partagez des documents ou demandez aux élèves de vous renvoyer un document rempli.
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

      {loadError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
        </div>
      ) : parentDocuments.length === 0 ? (
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
            {parentDocuments.map(doc => {
                const assigned = new Set(doc.destinataires_matricules || []);
                const submissions = getSubmissions(doc.id);
                const latestSubmissions = new Map<number, TfhDocument>();
                submissions.forEach(submission => {
                  if (submission.student_matricule == null) return;
                  const current = latestSubmissions.get(submission.student_matricule);
                  if (!current || new Date(submission.created_at) > new Date(current.created_at)) {
                    latestSubmissions.set(submission.student_matricule, submission);
                  }
                });
                const assignedCount = assigned.size;
                const returnedCount = Array.from(assigned).filter(id => latestSubmissions.has(id)).length;
                const expanded = expandedDocumentId === doc.id;
                const expectedRecipients = sortRecipients(recipients.filter(student =>
                  assigned.has(student.student_matricule) && !latestSubmissions.has(student.student_matricule)
                ));
                const returnedRecipients = sortRecipients(recipients.filter(student =>
                  latestSubmissions.has(student.student_matricule)
                ));
                const notExpectedRecipients = sortRecipients(recipients.filter(student =>
                  !assigned.has(student.student_matricule) && !latestSubmissions.has(student.student_matricule)
                ));
                const recipientGroups = [
                  { title: `Attendus (${expectedRecipients.length})`, students: expectedRecipients },
                  { title: `Rendus (${returnedRecipients.length})`, students: returnedRecipients },
                  { title: `Non attendus (${notExpectedRecipients.length})`, students: notExpectedRecipients },
                ];

                return (
                  <tbody key={doc.id} className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div>{doc.nom}</div>
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          doc.a_rendre ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          {doc.a_rendre ? `À rendre · ${returnedCount}/${assignedCount}` : 'Générique'}
                        </span>
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
                          {doc.a_rendre && (
                            <button
                              onClick={() => setExpandedDocumentId(expanded ? null : doc.id)}
                              className="px-2 py-1 text-xs text-amber-800 hover:bg-amber-50 rounded"
                              title="Afficher et modifier les destinataires"
                            >
                              {expanded ? 'Masquer' : 'Suivi'}
                            </button>
                          )}
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
                    {doc.a_rendre && expanded && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 px-5 py-4">
                          <p className="text-xs text-gray-500 mb-3">
                            Cochez ou décochez les élèves attendus. Les modifications sont enregistrées automatiquement.
                          </p>
                          <div className="space-y-4">
                            {recipientGroups.map(group => (
                              <section key={group.title}>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                  {group.title}
                                </h4>
                                {group.students.length === 0 ? (
                                  <p className="text-xs text-gray-400">Aucun élève dans cette catégorie.</p>
                                ) : (
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {group.students.map(student => {
                                      const submission = latestSubmissions.get(student.student_matricule);
                                      return (
                                        <div
                                          key={student.student_matricule}
                                          className="flex items-center gap-2 rounded border border-gray-200 bg-white p-2 text-xs"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={assigned.has(student.student_matricule)}
                                            onChange={() => handleToggleRecipient(doc, student.student_matricule)}
                                            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                          />
                                          <span className="min-w-0 flex-1">
                                            <span className="block font-medium text-gray-800">{student.classe} · {student.nom} {student.prenom}</span>
                                            <span className="text-gray-500">{student.type || 'Type non défini'}</span>
                                          </span>
                                          {submission ? (
                                            <>
                                              <a
                                                href={submission.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="shrink-0 text-cyan-700 underline"
                                              >
                                                Fichier
                                              </a>
                                              <StateCycleCheckbox
                                                value={submission.validation_status || 'pending'}
                                                options={validationOptions}
                                                onChange={status => handleValidationStatusChange(
                                                  submission,
                                                  status
                                                )}
                                                disabled={updatingSubmissionId === submission.id}
                                              />
                                            </>
                                          ) : assigned.has(student.student_matricule) ? (
                                            <span className="shrink-0 text-amber-700">Attendu</span>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </section>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
            })}
          </table>
        </div>
      )}

      {/* Modals */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSubmit={handleCreate}
          recipients={recipients}
        />
      )}

      {editingDoc && (
        <EditModal
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={(data) => handleUpdate(editingDoc.id, data)}
          recipients={recipients}
        />
      )}
    </div>
  );
}