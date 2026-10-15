'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FolderOpen, Download, FileText, AlertCircle, Loader2, Upload, CheckCircle2
} from 'lucide-react';

interface TfhDocument {
  id: string;
  nom: string;
  url: string;
  nom_fichier: string;
  taille_octets: number | null;
  mime_type: string | null;
  created_at: string;
  document_parent_id: string | null;
  a_rendre: boolean;
  destinataires_matricules: number[] | null;
  student_matricule: number | null;
  validation_status: 'pending' | 'validated' | 'rejected' | null;
}

interface DocumentsTabProps {
  matricule: number;
  onSubmissionChanged: () => Promise<void>;
}

const BUCKET = 'tfh-documents';
const MAX_SIZE = 20 * 1024 * 1024;

export default function DocumentsTab({ matricule, onSubmissionChanged }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<TfhDocument[]>([]);
  const [submissions, setSubmissions] = useState<TfhDocument[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: allDocuments, error: documentsError }, { data: studentSubmissions, error: submissionsError }] =
        await Promise.all([
          supabase
            .from('tfh_documents')
            .select('id, nom, url, nom_fichier, taille_octets, mime_type, created_at, document_parent_id, a_rendre, destinataires_matricules, student_matricule, validation_status')
            .is('document_parent_id', null)
            .order('nom', { ascending: true }),
          supabase
            .from('tfh_documents')
            .select('id, nom, url, nom_fichier, taille_octets, mime_type, created_at, document_parent_id, a_rendre, destinataires_matricules, student_matricule, validation_status')
            .eq('student_matricule', matricule)
            .not('document_parent_id', 'is', null)
            .order('created_at', { ascending: false }),
        ]);

      if (documentsError) throw documentsError;
      if (submissionsError) throw submissionsError;
      setDocuments((allDocuments || []) as TfhDocument[]);
      setSubmissions((studentSubmissions || []) as TfhDocument[]);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      setError('Impossible de charger les documents pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [matricule]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const genericDocuments = documents.filter(document => !document.a_rendre);
  const assignedDocuments = documents.filter(document =>
    document.a_rendre && (document.destinataires_matricules || []).includes(matricule)
  );

  const getSubmission = (documentId: string) =>
    submissions.find(submission => submission.document_parent_id === documentId);

  const handleFileChange = (documentId: string, event: ChangeEvent<HTMLInputElement>) => {
    setFiles(current => ({ ...current, [documentId]: event.target.files?.[0] || null }));
  };

  const handleSubmit = async (document: TfhDocument, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fileInput = event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
    const file = files[document.id];
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Sélectionne le document complété avant de l’envoyer.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(`Fichier trop volumineux (max 20 Mo). Taille : ${(file.size / 1024 / 1024).toFixed(2)} Mo.`);
      return;
    }

    setUploadingId(document.id);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${matricule}_${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { data, error: insertError } = await supabase
        .from('tfh_documents')
        .insert({
          nom: `Retour - ${document.nom}`,
          url: urlData.publicUrl,
          nom_fichier: file.name,
          taille_octets: file.size,
          mime_type: file.type || null,
          categorie: null,
          uploaded_by: null,
          student_matricule: matricule,
          document_parent_id: document.id,
          a_rendre: false,
          mode_ciblage: null,
          types_tfh: [],
          destinataires_matricules: [],
          validation_status: 'pending',
        })
        .select('id, nom, url, nom_fichier, taille_octets, mime_type, created_at, document_parent_id, a_rendre, destinataires_matricules, student_matricule, validation_status')
        .single();

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertError;
      }

      setSubmissions(current => [data as TfhDocument, ...current]);
      setFiles(current => ({ ...current, [document.id]: null }));
      setSuccess(`« ${document.nom} » a bien été envoyé.`);
      await onSubmissionChanged();
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Erreur envoi document:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l’envoi du document.');
    } finally {
      setUploadingId(null);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FICHIER';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-800">Documents TFH</h3>
        </div>
        <p className="text-sm text-gray-600">
          Télécharge les documents utiles et renvoie ici ceux que la coordination te demande de compléter.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Documents utiles</h3>
        {genericDocuments.length === 0 ? (
          <div className="bg-white/70 rounded-xl p-8 border border-gray-100 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">Aucun document générique disponible</p>
          </div>
        ) : genericDocuments.map(document => (
          <a
            key={document.id}
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-4 bg-white/80 hover:bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all p-4"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
              <span className="text-[10px] font-bold text-indigo-700 tracking-wide">{getFileExtension(document.nom_fichier).slice(0, 4)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 truncate">{document.nom}</p>
              <p className="mt-1 text-xs text-gray-500">
                {document.nom_fichier} · {formatSize(document.taille_octets)} · Ajouté le {formatDate(document.created_at)}
              </p>
            </div>
            <span className="flex items-center gap-2 text-indigo-600 text-xs font-medium">
              Télécharger <Download className="w-5 h-5" />
            </span>
          </a>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Documents à compléter</h3>
        {assignedDocuments.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white/70 p-6 text-sm text-gray-500">
            Aucun document ne t’est demandé pour le moment.
          </div>
        ) : assignedDocuments.map(document => {
          const submission = getSubmission(document.id);
          return (
            <article key={document.id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-gray-800">{document.nom}</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    {document.nom_fichier} · {formatSize(document.taille_octets)}
                  </p>
                </div>
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <Download className="h-4 w-4" /> Télécharger le modèle
                </a>
              </div>

              {submission && (
                <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                  submission.validation_status === 'rejected'
                    ? 'bg-red-50 text-red-800'
                    : submission.validation_status === 'validated'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-amber-50 text-amber-800'
                }`}>
                  <p className="font-semibold">
                    {submission.validation_status === 'rejected'
                      ? 'Document rejeté — envoie une version corrigée.'
                      : submission.validation_status === 'validated'
                        ? 'Document validé.'
                        : 'Document envoyé, en attente de validation.'}
                  </p>
                  <p className="mt-1">
                    Envoyé le {formatDate(submission.created_at)} :{' '}
                    <a href={submission.url} target="_blank" rel="noreferrer" className="font-medium underline">
                      {submission.nom_fichier}
                    </a>
                    {' '}· Tu peux le remplacer en envoyant une nouvelle version.
                  </p>
                </div>
              )}

              <form onSubmit={event => handleSubmit(document, event)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 text-xs font-medium text-gray-600">
                  {submission ? 'Choisir une nouvelle version' : 'Document complété (max 20 Mo)'}
                  <input
                    type="file"
                    required
                    onChange={event => handleFileChange(document.id, event)}
                    className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={uploadingId === document.id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploadingId === document.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingId === document.id ? 'Envoi...' : 'Envoyer mon document'}
                </button>
              </form>
              {files[document.id] && (
                <p className="mt-1 text-xs text-gray-500">Sélectionné : {files[document.id]?.name}</p>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
