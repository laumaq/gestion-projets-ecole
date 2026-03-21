'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ────────────────────────────────────────────────────────────
// ACCÈS RESTREINT : uniquement Laurent Maquet
// ────────────────────────────────────────────────────────────
const ALLOWED_USER_ID = '52793bea-994a-4b50-b768-75427df4747b'; // ← à adapter si l'id en base est différent

interface Projet {
  id: string;
  nom: string;
  description: string | null;
  dashboard: string;
  statut: string;
  created_at: string;
  consignes: string | null;
}

const STATUT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  brouillon: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Brouillon' },
  actif:     { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
  archive:   { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Archivé' },
};

const DASHBOARD_LABELS: Record<string, string> = {
  principal: '🏠 Dashboard principal',
  sciences:  '🔬 Dashboard sciences',
};

export default function ProjetsPage() {
  const router = useRouter();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const type = localStorage.getItem('userType');

    if (!id || type !== 'employee') { router.push('/'); return; }
    if (id !== ALLOWED_USER_ID) { router.push('/dashboard'); return; }

    setUserId(id);
    chargerProjets(id);
  }, [router]);

  const chargerProjets = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projets')
        .select('*')
        .eq('created_by', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjets(data || []);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    } finally {
      setLoading(false);
    }
  };

  const archiverProjet = async (id: string) => {
    await supabase.from('projets').update({ statut: 'archive' }).eq('id', id);
    chargerProjets(userId);
  };

  const activerProjet = async (id: string, statut: string) => {
    const nouveau = statut === 'actif' ? 'brouillon' : 'actif';
    await supabase.from('projets').update({ statut: nouveau }).eq('id', id);
    chargerProjets(userId);
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-4">Chargement…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* En-tête */}
      <div className="mb-8 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">🏛️ Lancement de projets</h1>
            <p className="text-indigo-100 text-sm">
              Créez et gérez des projets pédagogiques pour vos classes
            </p>
          </div>
          <Link
            href="/tools/projets/nouveau"
            className="flex items-center gap-2 bg-white text-indigo-700 font-semibold px-4 py-2 rounded-lg hover:bg-indigo-50 transition shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau projet
          </Link>
        </div>
      </div>

      {/* Liste des projets */}
      {projets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun projet créé</h3>
          <p className="text-gray-500 mb-6 text-sm">Commencez par créer votre premier projet pédagogique.</p>
          <Link
            href="/tools/projets/nouveau"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer un projet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projets.map(projet => {
            const st = STATUT_STYLES[projet.statut] ?? STATUT_STYLES.brouillon;
            return (
              <div key={projet.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition group">
                
                {/* Bande couleur statut */}
                <div className={`h-1 w-full ${
                  projet.statut === 'actif' ? 'bg-green-400' :
                  projet.statut === 'archive' ? 'bg-amber-400' : 'bg-gray-300'
                }`} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-gray-900 leading-snug">{projet.nom}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>

                  {projet.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{projet.description}</p>
                  )}

                  <p className="text-xs text-gray-400 mb-4">
                    {DASHBOARD_LABELS[projet.dashboard] ?? projet.dashboard} ·{' '}
                    Créé le {new Date(projet.created_at).toLocaleDateString('fr-FR')}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/tools/projets/${projet.id}`}
                      className="flex-1 text-center text-sm bg-indigo-50 text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                    >
                      Ouvrir
                    </Link>
                    {projet.statut !== 'archive' && (
                      <button
                        onClick={() => activerProjet(projet.id, projet.statut)}
                        className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${
                          projet.statut === 'actif'
                            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {projet.statut === 'actif' ? 'Désactiver' : 'Activer'}
                      </button>
                    )}
                    {projet.statut !== 'archive' && (
                      <button
                        onClick={() => {
                          if (confirm(`Archiver "${projet.nom}" ?`)) archiverProjet(projet.id);
                        }}
                        className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition"
                        title="Archiver"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}