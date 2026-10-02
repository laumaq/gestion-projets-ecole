// components/voyages/VoyageDocuments.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ── Utilitaire : nom de fichier safe pour Storage ────────────────────────────
// Supabase Storage refuse les accents et certains caractères spéciaux dans les clés.
// On normalise en ASCII, on remplace tout ce qui n'est pas [a-zA-Z0-9._-] par "_",
// on garde l'extension intacte.
function sanitizeFileName(name: string): string {
  // 1. Séparer le nom de l'extension
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : '';

  // 2. Normaliser (NFD) puis retirer les diacritiques (é → e, à → a, ç → c…)
  const normalizedBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 3. Remplacer tout caractère non-safe par "_"
  const safeBase = normalizedBase.replace(/[^a-zA-Z0-9._-]+/g, '_');

  // 4. Idem sur l'extension
  const safeExt = ext.replace(/[^a-z0-9]+/g, '');

  // 5. Fallback si le nom devient vide
  const finalBase = safeBase || `fichier_${Date.now()}`;

  return safeExt ? `${finalBase}.${safeExt}` : finalBase;
}

interface Props {
  voyageId: string;
  isResponsable: boolean;
  userType: 'employee' | 'student' | null;
  userId: string;
}

interface Doc {
  id: string;
  titre: string;
  url: string;
  uploaded_by: string | null;
  visible_eleves: boolean;
  created_at: string;
}

export default function VoyageDocuments({ voyageId, isResponsable, userType, userId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const isEmployee = userType === 'employee';
  const canEdit = isResponsable;

  useEffect(() => {
    loadDocs();
  }, [voyageId, userType]);

  const loadDocs = async () => {
    setLoading(true);
    let query = supabase
      .from('voyage_documents')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('created_at', { ascending: false });

    if (userType === 'student') {
      query = query.eq('visible_eleves', true);
    }

    const { data, error } = await query;
    if (!error && data) setDocs(data);
    setLoading(false);
  };

  const uploadDoc = async (titre: string, file: File, visibleEleves: boolean) => {
    setSaving(true);

    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name);
    const path = `${voyageId}/_communs/${timestamp}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('voyage-documents')
      .upload(path, file, { upsert: false });

    if (uploadError) {
      alert('Erreur upload : ' + uploadError.message);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('voyage-documents')
      .getPublicUrl(path);

    const { error: dbError } = await supabase
      .from('voyage_documents')
      .insert({
        voyage_id: voyageId,
        titre,
        url: urlData.publicUrl,
        uploaded_by: userId,
        visible_eleves: visibleEleves,
      });

    setSaving(false);
    if (dbError) {
      alert('Erreur lors de l\'enregistrement');
      console.error(dbError);
      return;
    }

    setShowUploadModal(false);
    loadDocs();
  };

  const toggleVisibilite = async (doc: Doc) => {
    setSaving(true);
    const { error } = await supabase
      .from('voyage_documents')
      .update({ visible_eleves: !doc.visible_eleves })
      .eq('id', doc.id);
    setSaving(false);
    if (!error) {
      setDocs(docs.map(d => d.id === doc.id ? { ...d, visible_eleves: !d.visible_eleves } : d));
    }
  };

  const supprimerDoc = async (doc: Doc) => {
    if (!confirm(`Supprimer le document "${doc.titre}" ?`)) return;
    setSaving(true);
    const { error } = await supabase.from('voyage_documents').delete().eq('id', doc.id);
    setSaving(false);
    if (!error) {
      setDocs(docs.filter(d => d.id !== doc.id));
    }
  };

  if (loading) return <div className="text-center py-8">Chargement des documents...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">📎 Documents du voyage</h2>
        {canEdit && (
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            + Ajouter un document
          </button>
        )}
      </div>

      {isEmployee && !canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 text-sm">
            👋 Vous pouvez consulter les documents ci-dessous.
          </p>
        </div>
      )}

      {userType === 'student' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 text-sm">
            👋 Voici les documents mis à disposition par les organisateurs du voyage.
          </p>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-gray-500">Aucun document pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg border p-4 flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📄</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{doc.titre}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-BE')}
                </p>

                {canEdit ? (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={doc.visible_eleves}
                      onChange={() => toggleVisibilite(doc)}
                      disabled={saving}
                      className="rounded"
                    />
                    <span>
                      {doc.visible_eleves ? '👁️ Visible aux élèves' : '🔒 Réservé aux employés'}
                    </span>
                  </label>
                ) : (
                  !doc.visible_eleves && (
                    <p className="text-xs text-gray-400 italic mt-1">🔒 Réservé aux employés</p>
                  )
                )}

                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  📎 Visualiser / Télécharger
                </a>
              </div>
              {canEdit && (
                <button
                  onClick={() => supprimerDoc(doc)}
                  disabled={saving}
                  className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                  title="Supprimer"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal d'upload ── */}
      {showUploadModal && (
        <ModalUploadDocument
          onClose={() => setShowUploadModal(false)}
          onUpload={uploadDoc}
          saving={saving}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal d'upload
// ─────────────────────────────────────────────────────────────────────────────

function ModalUploadDocument({
  onClose,
  onUpload,
  saving,
}: {
  onClose: () => void;
  onUpload: (titre: string, file: File, visibleEleves: boolean) => void;
  saving: boolean;
}) {
  const [titre, setTitre] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [visibleEleves, setVisibleEleves] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      alert('Le titre est obligatoire.');
      return;
    }
    if (!file) {
      alert('Sélectionnez un fichier.');
      return;
    }
    onUpload(titre.trim(), file, visibleEleves);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Ajouter un document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre du document <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Autorisation de sortie du territoire"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
              disabled={saving}
            />
            {file && (
              <p className="text-xs text-gray-500 mt-1">
                Sélectionné : {file.name} ({(file.size / 1024).toFixed(1)} Ko)
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleEleves}
                onChange={(e) => setVisibleEleves(e.target.checked)}
                className="rounded"
                disabled={saving}
              />
              <span className="text-sm text-gray-700">
                👁️ Visible aux élèves
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Décochez pour réserver ce document aux employés.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !titre.trim() || !file}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Upload en cours...' : '⬆ Uploader'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}