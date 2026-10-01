// components/voyages/VoyageDocuments.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    const path = `${voyageId}/_communs/${timestamp}_${file.name}`;

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

    loadDocs();
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
            onClick={() => {
              const titre = prompt('Titre du document :');
              if (!titre) return;
              const visible = confirm(
                'Rendre ce document visible aux élèves ?\n\nOK = Visible\nAnnuler = Réservé aux employés'
              );
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,application/pdf';
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) uploadDoc(titre, f, visible);
              };
              input.click();
            }}
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
                  {!doc.visible_eleves && ' · 🔒 Non visible aux élèves'}
                </p>
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
    </div>
  );
}