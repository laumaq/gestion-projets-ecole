// app/tools/tfh/eleve/tabs/DocumentsTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FolderOpen, Download, FileText,
  AlertCircle, Loader2
} from 'lucide-react';

interface TfhDocument {
  id: string;
  nom: string;
  url: string;
  nom_fichier: string;
  taille_octets: number | null;
  mime_type: string | null;
  created_at: string;
}

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<TfhDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('tfh_documents')
          .select('id, nom, url, nom_fichier, taille_octets, mime_type, created_at')
          .order('nom', { ascending: true });

        if (error) throw error;
        setDocuments(data || []);
      } catch (err: any) {
        console.error('Erreur chargement documents:', err);
        setError('Impossible de charger les documents pour le moment.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

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
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 rounded-xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-800">Documents utiles</h3>
        </div>
        <p className="text-sm text-gray-600">
          Retrouve ici tous les documents mis à ta disposition par les coordinateurs TFH
          (modèles, conventions, grilles, etc.). Clique sur un document pour le télécharger.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Liste vide */}
      {!error && documents.length === 0 && (
        <div className="bg-white/70 rounded-xl p-12 border border-gray-100 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun document disponible</p>
          <p className="text-sm text-gray-400 mt-1">
            Les documents partagés par tes coordinateurs apparaîtront ici.
          </p>
        </div>
      )}

      {/* Liste des documents */}
      {!error && documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => {
            const ext = getFileExtension(doc.nom_fichier);
            return (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="group block bg-white/80 hover:bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Badge extension */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-indigo-700 tracking-wide">
                      {ext.slice(0, 4)}
                    </span>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
                      {doc.nom}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                      <span className="truncate max-w-[16rem]">{doc.nom_fichier}</span>
                      <span className="text-gray-300">·</span>
                      <span>{formatSize(doc.taille_octets)}</span>
                      <span className="text-gray-300">·</span>
                      <span>Ajouté le {formatDate(doc.created_at)}</span>
                    </div>
                  </div>

                  {/* Bouton télécharger */}
                  <div className="flex-shrink-0 flex items-center gap-2 text-indigo-600 group-hover:text-indigo-800 transition-colors">
                    <span className="hidden sm:inline text-xs font-medium">Télécharger</span>
                    <Download className="w-5 h-5" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}