'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ALLOWED_USER_ID = '52793bea-994a-4b50-b768-75427df4747b'; // ← à adapter si l'id en base est différent

// ── Types ──────────────────────────────────────────────────
interface Projet {
  id: string; nom: string; description: string | null;
  dashboard: string; statut: string; consignes: string | null;
  mode_sources: string; max_sources_par_eleve: number | null;
  created_by: string;
}
interface Objectif {
  id: string; titre: string; description: string | null;
  echeance: string | null; ordre: number;
}
interface SousGroupe {
  id: string; nom: string; description: string | null; ordre: number;
  membres?: Student[];
}
interface Student {
  matricule: number; nom: string; prenom: string; classe: string;
}
interface Source {
  id: string; titre: string; auteur: string | null; url: string | null;
  description: string | null; sous_groupes_cibles: string[] | null; ordre: number;
}

type TabId = 'consignes' | 'objectifs' | 'groupes' | 'sources' | 'parametres';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'consignes', label: 'Consignes', icon: '📋' },
  { id: 'objectifs', label: 'Objectifs', icon: '🎯' },
  { id: 'groupes',   label: 'Sous-groupes', icon: '👥' },
  { id: 'sources',   label: 'Sources', icon: '📚' },
  { id: 'parametres', label: 'Paramètres', icon: '⚙️' },
];

// ── Helpers ───────────────────────────────────────────────
function isUrl(s: string) {
  try { new URL(s); return true; } catch { return false; }
}

// ── Modale générique ───────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════
export default function ProjetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projetId = params.id as string;

  const [userId, setUserId] = useState('');
  const [tab, setTab] = useState<TabId>('consignes');
  const [projet, setProjet] = useState<Projet | null>(null);
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [sousGroupes, setSousGroupes] = useState<SousGroupe[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // — Modales
  const [modalObjectif, setModalObjectif] = useState(false);
  const [modalSousGroupe, setModalSousGroupe] = useState(false);
  const [modalSource, setModalSource] = useState(false);
  const [modalAffectation, setModalAffectation] = useState<string | null>(null); // sous_groupe_id
  const [editConsignes, setEditConsignes] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const type = localStorage.getItem('userType');
    if (!id || type !== 'employee') { router.push('/'); return; }
    // Accès : créateur ou co-responsable/observateur
    setUserId(id);
    charger(id);
  }, [router, projetId]);

  const charger = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      // Projet
      const { data: p } = await supabase.from('projets').select('*').eq('id', projetId).single();
      if (!p) { router.push('/tools/projets'); return; }
      setProjet(p);

      // Vérifier accès (créateur ou dans projet_acces_employees)
      if (p.created_by !== uid) {
        const { data: acces } = await supabase.from('projet_acces_employees')
          .select('id').eq('projet_id', projetId).eq('employee_id', uid).single();
        if (!acces) { router.push('/dashboard'); return; }
      }

      // Objectifs
      const { data: obj } = await supabase.from('projet_objectifs')
        .select('*').eq('projet_id', projetId).order('ordre');
      setObjectifs(obj || []);

      // Sous-groupes + membres
      const { data: sg } = await supabase.from('projet_sous_groupes')
        .select('*').eq('projet_id', projetId).order('ordre');
      const sgList: SousGroupe[] = sg || [];

      if (sgList.length > 0) {
        const { data: membres } = await supabase
          .from('projet_sous_groupe_membres')
          .select('sous_groupe_id, eleve_matricule, students(matricule, nom, prenom, classe)')
          .in('sous_groupe_id', sgList.map(s => s.id));
        const membresByGroup: Record<string, Student[]> = {};
        (membres || []).forEach((m: any) => {
          if (!membresByGroup[m.sous_groupe_id]) membresByGroup[m.sous_groupe_id] = [];
          if (m.students) membresByGroup[m.sous_groupe_id].push(m.students);
        });
        sgList.forEach(s => { s.membres = membresByGroup[s.id] || []; });
      }
      setSousGroupes(sgList);

      // Sources
      const { data: src } = await supabase.from('projet_sources')
        .select('*').eq('projet_id', projetId).order('ordre');
      setSources(src || []);

      // Élèves ciblés par le projet
      await chargerElevesDisponibles();
    } finally {
      setLoading(false);
    }
  }, [projetId, router]);

  const chargerElevesDisponibles = async () => {
    const { data } = await supabase
      .from('projet_eleves')
      .select('matricule, students(matricule, nom, prenom, classe)')
      .eq('projet_id', projetId);

    const eleves = (data || [])
      .map((row: any) => row.students)
      .filter(Boolean)
      .sort((a: any, b: any) =>
        a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom)
      );

    setElevesDisponibles(eleves);
  };

  if (loading || !projet) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-4">Chargement…</p>
        </div>
      </main>
    );
  }

  const isOwner = projet && projet.created_by === userId;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/tools/projets')} className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{projet.nom}</h1>
              {projet.description && <p className="text-sm text-gray-500">{projet.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              projet.statut === 'actif' ? 'bg-green-100 text-green-700' :
              projet.statut === 'archive' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {projet.statut === 'actif' ? '● Actif' : projet.statut === 'archive' ? 'Archivé' : 'Brouillon'}
            </span>
            {isOwner && (
              <button
                onClick={async () => {
                  const nouveau = projet.statut === 'actif' ? 'brouillon' : 'actif';
                  await supabase.from('projets').update({ statut: nouveau }).eq('id', projet.id);
                  setProjet(p => p ? { ...p, statut: nouveau } : p);
                }}
                className="text-sm bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 transition"
              >
                {projet.statut === 'actif' ? 'Désactiver' : 'Activer'}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 ml-8">
          {projet.dashboard === 'sciences' ? '🔬 Dashboard sciences' : '🏠 Dashboard principal'} ·{' '}
          {elevesDisponibles.length} élève{elevesDisponibles.length > 1 ? 's' : ''} ciblé{elevesDisponibles.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px ${
              tab === t.id
                ? 'text-indigo-700 border-indigo-500 bg-indigo-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB : Consignes ── */}
      {tab === 'consignes' && (
        <ConsignesTab
          projet={projet}
          isOwner={!!isOwner}
          editConsignes={editConsignes}
          setEditConsignes={setEditConsignes}
          onSave={async (val) => {
            await supabase.from('projets').update({ consignes: val }).eq('id', projet.id);
            setProjet(p => p ? { ...p, consignes: val } : p);
            setEditConsignes(false);
          }}
        />
      )}

      {/* ── TAB : Objectifs ── */}
      {tab === 'objectifs' && (
        <ObjectifsTab
          objectifs={objectifs}
          isOwner={!!isOwner}
          onAdd={() => setModalObjectif(true)}
          onDelete={async (id) => {
            await supabase.from('projet_objectifs').delete().eq('id', id);
            setObjectifs(prev => prev.filter(o => o.id !== id));
          }}
        />
      )}

      {/* ── TAB : Sous-groupes ── */}
      {tab === 'groupes' && (
        <SousGroupesTab
          sousGroupes={sousGroupes}
          elevesDisponibles={elevesDisponibles}
          isOwner={!!isOwner}
          onAdd={() => setModalSousGroupe(true)}
          onAffecterEleves={(sgId) => setModalAffectation(sgId)}
          onDelete={async (id) => {
            await supabase.from('projet_sous_groupes').delete().eq('id', id);
            setSousGroupes(prev => prev.filter(s => s.id !== id));
          }}
          onRepartitionAleatoire={async () => {
            if (sousGroupes.length === 0) return;
            // Supprimer toutes les attributions actuelles
            const ids = sousGroupes.map(s => s.id);
            await supabase.from('projet_sous_groupe_membres').delete().in('sous_groupe_id', ids);
            // Mélanger les élèves
            const shuffled = [...elevesDisponibles].sort(() => Math.random() - 0.5);
            const taille = Math.ceil(shuffled.length / sousGroupes.length);
            const insertions: any[] = [];
            sousGroupes.forEach((sg, i) => {
              const membres = shuffled.slice(i * taille, (i + 1) * taille);
              membres.forEach(m => insertions.push({
                sous_groupe_id: sg.id,
                eleve_matricule: m.matricule,
              }));
            });
            if (insertions.length > 0) await supabase.from('projet_sous_groupe_membres').insert(insertions);
            charger(userId);
          }}
        />
      )}

      {/* ── TAB : Sources ── */}
      {tab === 'sources' && (
        <SourcesTab
          sources={sources}
          sousGroupes={sousGroupes}
          modeSource={projet.mode_sources}
          isOwner={!!isOwner}
          onAdd={() => setModalSource(true)}
          onDelete={async (id) => {
            await supabase.from('projet_sources').delete().eq('id', id);
            setSources(prev => prev.filter(s => s.id !== id));
          }}
        />
      )}

      {tab === 'parametres' && isOwner && (
        <ParametresTab
          projet={projet}
          onSave={(updates) => setProjet(p => p ? { ...p, ...updates } : p)}
          projetId={projetId}
          userId={userId}
        />
      )}

      {/* ══ MODALES ══ */}

      {/* Ajouter objectif */}
      {modalObjectif && (
        <ModalObjectif
          projetId={projetId}
          ordre={objectifs.length}
          onClose={() => setModalObjectif(false)}
          onSave={(obj) => { setObjectifs(prev => [...prev, obj]); setModalObjectif(false); }}
        />
      )}

      {/* Ajouter sous-groupe */}
      {modalSousGroupe && (
        <ModalSousGroupe
          projetId={projetId}
          ordre={sousGroupes.length}
          elevesDisponibles={elevesDisponibles}
          onClose={() => setModalSousGroupe(false)}
          onSave={(sg) => { setSousGroupes(prev => [...prev, sg]); setModalSousGroupe(false); }}
        />
      )}

      {/* Ajouter source */}
      {modalSource && (
        <ModalSource
          projetId={projetId}
          sousGroupes={sousGroupes}
          ordre={sources.length}
          onClose={() => setModalSource(false)}
          onSave={(src) => { setSources(prev => [...prev, src]); setModalSource(false); }}
        />
      )}

      {/* Affecter élèves à un sous-groupe */}
      {modalAffectation && (
        <ModalAffectation
          sousGroupe={sousGroupes.find(s => s.id === modalAffectation)!}
          elevesDisponibles={elevesDisponibles}
          tousLesMembres={sousGroupes.flatMap(s => s.membres || [])}
          onClose={() => setModalAffectation(null)}
          onSave={() => { setModalAffectation(null); charger(userId); }}
        />
      )}

    </main>
  );
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

// ── Consignes Tab ──────────────────────────────────────────
function ConsignesTab({ projet, isOwner, editConsignes, setEditConsignes, onSave }: {
  projet: Projet; isOwner: boolean; editConsignes: boolean;
  setEditConsignes: (v: boolean) => void;
  onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(projet.consignes || '');
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">📋 Consignes générales</h2>
        {isOwner && !editConsignes && (
          <button onClick={() => setEditConsignes(true)} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier
          </button>
        )}
      </div>
      {editConsignes ? (
        <div>
          <textarea
            value={val}
            onChange={e => setVal(e.target.value)}
            rows={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="Consignes générales, cadre du projet…"
          />
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={() => setEditConsignes(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
              Annuler
            </button>
            <button onClick={() => onSave(val)} className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium">
              Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          {projet.consignes ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {projet.consignes}
            </pre>
          ) : (
            <p className="text-gray-400 italic text-sm">Aucune consigne définie.{isOwner && ' Cliquez sur Modifier pour en ajouter.'}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Objectifs Tab ──────────────────────────────────────────
function ObjectifsTab({ objectifs, isOwner, onAdd, onDelete }: {
  objectifs: Objectif[]; isOwner: boolean;
  onAdd: () => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <button onClick={onAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un objectif
          </button>
        </div>
      )}
      {objectifs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">Aucun objectif défini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {objectifs.map((obj, i) => (
            <div key={obj.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{obj.titre}</p>
                {obj.description && <p className="text-xs text-gray-500 mt-1">{obj.description}</p>}
                {obj.echeance && (
                  <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Échéance : {new Date(obj.echeance).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              {isOwner && (
                <button onClick={() => { if (confirm('Supprimer cet objectif ?')) onDelete(obj.id); }} className="text-gray-300 hover:text-red-500 transition flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sous-groupes Tab ───────────────────────────────────────
function SousGroupesTab({ sousGroupes, elevesDisponibles, isOwner, onAdd, onAffecterEleves, onDelete, onRepartitionAleatoire }: {
  sousGroupes: SousGroupe[]; elevesDisponibles: Student[];
  isOwner: boolean;
  onAdd: () => void;
  onAffecterEleves: (id: string) => void;
  onDelete: (id: string) => void;
  onRepartitionAleatoire: () => void;
}) {
  const totalMembres = sousGroupes.reduce((acc, sg) => acc + (sg.membres?.length || 0), 0);
  const sansSousGroupe = elevesDisponibles.filter(e =>
    !sousGroupes.some(sg => sg.membres?.some(m => m.matricule === e.matricule))
  );

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-500">
            {totalMembres}/{elevesDisponibles.length} élève{elevesDisponibles.length > 1 ? 's' : ''} affecté{totalMembres > 1 ? 's' : ''}
            {sansSousGroupe.length > 0 && (
              <span className="ml-2 text-amber-600 font-medium">· {sansSousGroupe.length} sans groupe</span>
            )}
          </p>
          <div className="flex gap-2">
            {sousGroupes.length > 0 && elevesDisponibles.length > 0 && (
              <button
                onClick={() => { if (confirm('Réinitialiser et répartir aléatoirement tous les élèves ?')) onRepartitionAleatoire(); }}
                className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
              >
                🎲 Répartition aléatoire
              </button>
            )}
            <button onClick={onAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau sous-groupe
            </button>
          </div>
        </div>
      )}

      {sousGroupes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">Aucun sous-groupe créé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sousGroupes.map(sg => (
            <div key={sg.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">{sg.nom}</h3>
                <div className="flex items-center gap-1">
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {sg.membres?.length || 0} membre{(sg.membres?.length || 0) > 1 ? 's' : ''}
                  </span>
                  {isOwner && (
                    <>
                      <button onClick={() => onAffecterEleves(sg.id)} className="text-xs text-gray-400 hover:text-indigo-600 transition px-1.5 py-0.5 rounded hover:bg-indigo-50" title="Gérer les membres">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                      <button onClick={() => { if (confirm(`Supprimer "${sg.nom}" ?`)) onDelete(sg.id); }} className="text-gray-300 hover:text-red-500 transition px-1.5 py-0.5 rounded hover:bg-red-50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
              {sg.description && <p className="text-xs text-gray-500 mb-2">{sg.description}</p>}
              <div className="flex flex-wrap gap-1">
                {(sg.membres || []).map(m => (
                  <span key={m.matricule} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {m.nom} {m.prenom}
                  </span>
                ))}
                {(sg.membres || []).length === 0 && (
                  <span className="text-xs text-gray-300 italic">Aucun membre</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sources Tab ───────────────────────────────────────────
function SourcesTab({ sources, sousGroupes, modeSource, isOwner, onAdd, onDelete }: {
  sources: Source[]; sousGroupes: SousGroupe[];
  modeSource: string; isOwner: boolean;
  onAdd: () => void; onDelete: (id: string) => void;
}) {
  const MODE_LABELS: Record<string, string> = {
    consultation_seule: 'Consultation seule',
    unique: 'Choix d\'une source',
    differentes: 'Sources différentes par élève',
    libre: 'Choix libre',
  };
  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            Mode : {MODE_LABELS[modeSource] ?? modeSource}
          </span>
          <button onClick={onAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une source
          </button>
        </div>
      )}
      {sources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">Aucune source bibliographique ajoutée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((src, i) => {
            const cibles = src.sous_groupes_cibles;
            const nomsCibles = cibles
              ? sousGroupes.filter(sg => cibles.includes(sg.id)).map(sg => sg.nom).join(', ')
              : null;
            return (
              <div key={src.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{src.titre}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {nomsCibles ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {nomsCibles}
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Tous
                        </span>
                      )}
                    </div>
                  </div>
                  {src.auteur && <p className="text-xs text-gray-400 mt-0.5">{src.auteur}</p>}
                  {src.description && <p className="text-xs text-gray-500 mt-1">{src.description}</p>}
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-1 flex items-center gap-1 truncate max-w-xs"
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="truncate">{src.url}</span>
                    </a>
                  )}
                </div>
                {isOwner && (
                  <button onClick={() => { if (confirm('Supprimer cette source ?')) onDelete(src.id); }} className="text-gray-300 hover:text-red-500 transition flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODALES
// ══════════════════════════════════════════════════════════════

function ModalObjectif({ projetId, ordre, onClose, onSave }: {
  projetId: string; ordre: number;
  onClose: () => void; onSave: (obj: Objectif) => void;
}) {
  const [titre, setTitre] = useState('');
  const [desc, setDesc] = useState('');
  const [echeance, setEcheance] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!titre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('projet_objectifs').insert({
      projet_id: projetId,
      titre: titre.trim(),
      description: desc.trim() || null,
      echeance: echeance || null,
      ordre,
    }).select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  return (
    <Modal title="Ajouter un objectif" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre <span className="text-red-500">*</span></label>
          <input value={titre} onChange={e => setTitre(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="ex: Rédiger une synthèse de la source attribuée" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="Précisions supplémentaires…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
          <input type="date" value={echeance} onChange={e => setEcheance(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
          <button onClick={save} disabled={!titre.trim() || saving}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalSousGroupe({ projetId, ordre, elevesDisponibles, onClose, onSave }: {
  projetId: string; ordre: number;
  elevesDisponibles: Student[];
  onClose: () => void; onSave: (sg: SousGroupe) => void;
}) {
  const [nom, setNom] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nom.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('projet_sous_groupes').insert({
      projet_id: projetId,
      nom: nom.trim(),
      description: desc.trim() || null,
      ordre,
    }).select().single();
    setSaving(false);
    if (!error && data) onSave({ ...data, membres: [] });
  };

  return (
    <Modal title="Créer un sous-groupe" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
          <input value={nom} onChange={e => setNom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="ex: Commission Nucléaire, Commission Solaire…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Brève description du rôle de ce groupe" />
        </div>
        <p className="text-xs text-gray-400">
          💡 Vous pourrez affecter les élèves depuis l'onglet Sous-groupes, ou utiliser la répartition aléatoire si plusieurs groupes sont créés.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
          <button onClick={save} disabled={!nom.trim() || saving}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50">
            {saving ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalAffectation({ sousGroupe, elevesDisponibles, tousLesMembres, onClose, onSave }: {
  sousGroupe: SousGroupe;
  elevesDisponibles: Student[];
  tousLesMembres: Student[];
  onClose: () => void; onSave: () => void;
}) {
  const [selection, setSelection] = useState<number[]>(
    (sousGroupe.membres || []).map(m => m.matricule)
  );
  const [saving, setSaving] = useState(false);

  const toggle = (mat: number) =>
    setSelection(prev => prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]);

  const save = async () => {
    setSaving(true);
    // Supprimer les membres actuels de ce groupe
    await supabase.from('projet_sous_groupe_membres')
      .delete().eq('sous_groupe_id', sousGroupe.id);
    // Insérer les nouveaux
    if (selection.length > 0) {
      await supabase.from('projet_sous_groupe_membres').insert(
        selection.map(mat => ({ sous_groupe_id: sousGroupe.id, eleve_matricule: mat }))
      );
    }
    setSaving(false);
    onSave();
  };

  // Élèves déjà dans un autre groupe (pour les griser)
  const autresGroupes = tousLesMembres
    .filter(m => !(sousGroupe.membres || []).some(sm => sm.matricule === m.matricule))
    .map(m => m.matricule);

  return (
    <Modal title={`Membres — ${sousGroupe.nom}`} onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">
        Sélectionnez les élèves à affecter à ce sous-groupe. Les élèves en gris sont déjà dans un autre groupe.
      </p>
      <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
        {elevesDisponibles.map(e => {
          const sel = selection.includes(e.matricule);
          const autreGroupe = autresGroupes.includes(e.matricule);
          return (
            <div
              key={e.matricule}
              onClick={() => toggle(e.matricule)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                sel ? 'bg-indigo-50 border border-indigo-200' :
                autreGroupe ? 'opacity-40 hover:opacity-60' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                sel ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
              }`}>
                {sel && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>}
              </div>
              <span className="text-sm text-gray-800">{e.nom} {e.prenom}</span>
              <span className="text-xs text-gray-400 ml-auto">{e.classe}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mb-4">{selection.length} sélectionné{selection.length > 1 ? 's' : ''}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
        <button onClick={save} disabled={saving}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

function ModalSource({ projetId, sousGroupes, ordre, onClose, onSave }: {
  projetId: string; sousGroupes: SousGroupe[]; ordre: number;
  onClose: () => void; onSave: (src: Source) => void;
}) {
  const [titre, setTitre] = useState('');
  const [auteur, setAuteur] = useState('');
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [cibles, setCibles] = useState<string[]>([]); // [] = tous
  const [saving, setSaving] = useState(false);

  const toggleCible = (id: string) =>
    setCibles(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const save = async () => {
    if (!titre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('projet_sources').insert({
      projet_id: projetId,
      titre: titre.trim(),
      auteur: auteur.trim() || null,
      url: url.trim() || null,
      description: desc.trim() || null,
      sous_groupes_cibles: cibles.length > 0 ? cibles : null,
      ordre,
    }).select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  return (
    <Modal title="Ajouter une source" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre <span className="text-red-500">*</span></label>
          <input value={titre} onChange={e => setTitre(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="ex: Rapport IEA 2024 sur l'énergie nucléaire" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Auteur / Source</label>
          <input value={auteur} onChange={e => setAuteur(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="ex: Agence Internationale de l'Énergie, 2024" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL (optionnel)</label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
              url && !isUrl(url) ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
            }`}
            placeholder="https://…" />
          {url && !isUrl(url) && <p className="text-xs text-amber-600 mt-1">URL invalide</p>}
          {url && isUrl(url) && <p className="text-xs text-green-600 mt-1">✓ Lien actif</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="Contexte, pertinence, pages à consulter…" />
        </div>

        {sousGroupes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attribuer à (laisser vide = tous les sous-groupes)
            </label>
            <div className="flex flex-wrap gap-2">
              {sousGroupes.map(sg => (
                <button key={sg.id} onClick={() => toggleCible(sg.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    cibles.includes(sg.id)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}>
                  {sg.nom}
                </button>
              ))}
            </div>
            {cibles.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Visible par tous les sous-groupes</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
          <button onClick={save} disabled={!titre.trim() || saving}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ParametresTab({ projet, onSave, projetId, userId }: {
  projet: Projet;
  onSave: (updates: Partial<Projet>) => void;
  projetId: string;
  userId: string;
}) {
  // — Panneau 1 : infos générales
  const [nom, setNom] = useState(projet.nom);
  const [description, setDescription] = useState(projet.description || '');
  const [dashboard, setDashboard] = useState(projet.dashboard);
  const [modeSource, setModeSource] = useState(projet.mode_sources);
  const [maxSources, setMaxSources] = useState<number | ''>(projet.max_sources_par_eleve ?? '');
  const [saving1, setSaving1] = useState(false);
  const [saved1, setSaved1] = useState(false);

  // — Panneau 2 : élèves
  const [elevesProjet, setElevesProjet] = useState<Student[]>([]);
  const [elevesParClasse, setElevesParClasse] = useState<Student[]>([]);
  const [elevesParGroupe, setElevesParGroupe] = useState<Student[]>([]);
  const [elevesIndividuels, setElevesIndividuels] = useState<Student[]>([]);
  const [exclus, setExclus] = useState<number[]>([]);
  const [classesDisponibles, setClassesDisponibles] = useState<{value:string;label:string}[]>([]);
  const [groupesDisponibles, setGroupesDisponibles] = useState<{value:string;label:string}[]>([]);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);
  const [groupesSelectionnes, setGroupesSelectionnes] = useState<string[]>([]);
  const [rechercheClasse, setRechercheClasse] = useState('');
  const [rechercheGroupe, setRechercheGroupe] = useState('');
  const [filtreNom, setFiltreNom] = useState('');
  const [filtrePrenom, setFiltrePrenom] = useState('');
  const [filtreClasse, setFiltreClasse] = useState('');
  const [rechercheIndividuelle, setRechercheIndividuelle] = useState<Student[]>([]);
  const [saving2, setSaving2] = useState(false);
  const [saved2, setSaved2] = useState(false);

  // — Panneau 3 : équipe
  const [employees, setEmployees] = useState<{id:string;nom:string;prenom:string;initiale:string}[]>([]);
  const [accesEmployees, setAccesEmployees] = useState<{id:string;role:'responsable'|'observateur'}[]>([]);
  const [rechercheEmployee, setRechercheEmployee] = useState('');
  const [saving3, setSaving3] = useState(false);
  const [saved3, setSaved3] = useState(false);

  // Élèves sélectionnés calculés
  const elevesSelectionnes: Student[] = (() => {
    const map = new Map<number, Student>();
    [...elevesParClasse, ...elevesParGroupe, ...elevesIndividuels]
      .forEach(e => map.set(e.matricule, e));
    exclus.forEach(m => map.delete(m));
    return Array.from(map.values()).sort((a, b) =>
      a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom)
    );
  })();

  // Chargement initial
  useEffect(() => {
    // Élèves actuels du projet
    supabase.from('projet_eleves')
      .select('matricule, students(matricule, nom, prenom, classe)')
      .eq('projet_id', projetId)
      .then(({ data }) => {
        const eleves = (data || []).map((r: any) => r.students).filter(Boolean);
        setElevesProjet(eleves);
        setElevesIndividuels(eleves); // pré-remplir comme individuels
      });

    // Classes disponibles
    supabase.from('students').select('classe').order('classe').then(({ data }) => {
      const classes = (data || [])
        .map((s: any) => s.classe)
        .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
        .map(c => ({ value: c, label: c }));
      setClassesDisponibles(classes);
    });

    // Groupes disponibles
    supabase.from('students_groups').select('groupe_code').then(({ data }) => {
      const groupes = (data || [])
        .map((g: any) => g.groupe_code)
        .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
        .sort((a: string, b: string) => a.localeCompare(b))
        .map(g => ({ value: g, label: g }));
      setGroupesDisponibles(groupes);
    });

    // Accès employees actuels
    supabase.from('projet_acces_employees')
      .select('employee_id, role').eq('projet_id', projetId)
      .then(({ data }) => {
        setAccesEmployees((data || []).map((a: any) => ({ id: a.employee_id, role: a.role })));
      });

    // Tous les employees
    supabase.from('employees').select('id, nom, prenom, initiale').order('nom')
      .then(({ data }) => {
        setEmployees((data || []).filter((e: any) => e.id !== userId));
      });
  }, [projetId, userId]);

  // Élèves des classes sélectionnées
  useEffect(() => {
    if (classesSelectionnees.length === 0) { setElevesParClasse([]); return; }
    supabase.from('students').select('matricule, nom, prenom, classe')
      .in('classe', classesSelectionnees).order('classe').order('nom')
      .then(({ data }) => setElevesParClasse(data || []));
  }, [classesSelectionnees]);

  // Élèves des groupes sélectionnés
  useEffect(() => {
    if (groupesSelectionnes.length === 0) { setElevesParGroupe([]); return; }
    supabase.from('students_groups').select('matricule')
      .in('groupe_code', groupesSelectionnes)
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setElevesParGroupe([]); return; }
        const mats: number[] = [];
        data.forEach((g: any) => { if (mats.indexOf(g.matricule) === -1) mats.push(g.matricule); });
        const { data: students } = await supabase.from('students')
          .select('matricule, nom, prenom, classe').in('matricule', mats)
          .order('classe').order('nom');
        setElevesParGroupe(students || []);
      });
  }, [groupesSelectionnes]);

  // Recherche individuelle
  useEffect(() => {
    if (!filtreNom && !filtrePrenom && !filtreClasse) { setRechercheIndividuelle([]); return; }
    const timer = setTimeout(async () => {
      let query = supabase.from('students').select('matricule, nom, prenom, classe')
        .order('classe').order('nom').limit(10);
      if (filtreNom)    query = query.ilike('nom',    `%${filtreNom}%`);
      if (filtrePrenom) query = query.ilike('prenom', `%${filtrePrenom}%`);
      if (filtreClasse) query = query.ilike('classe', `%${filtreClasse}%`);
      const { data } = await query;
      setRechercheIndividuelle(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtreNom, filtrePrenom, filtreClasse]);

  const toggleClasse = (v: string) =>
    setClassesSelectionnees(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleGroupe = (v: string) =>
    setGroupesSelectionnes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleEleveIndividuel = (eleve: Student) =>
    setElevesIndividuels(prev =>
      prev.some(e => e.matricule === eleve.matricule)
        ? prev.filter(e => e.matricule !== eleve.matricule)
        : [...prev, eleve]
    );
  const retirerEleve = (matricule: number) => {
    if (elevesIndividuels.some(e => e.matricule === matricule)) {
      setElevesIndividuels(prev => prev.filter(e => e.matricule !== matricule));
    } else {
      setExclus(prev => prev.indexOf(matricule) === -1 ? [...prev, matricule] : prev);
    }
  };

  const toggleEmployee = (id: string) =>
    setAccesEmployees(prev =>
      prev.find(e => e.id === id) ? prev.filter(e => e.id !== id) : [...prev, { id, role: 'observateur' }]
    );
  const setRoleEmployee = (id: string, role: 'responsable' | 'observateur') =>
    setAccesEmployees(prev => prev.map(e => e.id === id ? { ...e, role } : e));

  // Save panneau 1
  const saveInfos = async () => {
    if (!nom.trim()) return;
    setSaving1(true);
    const updates = {
      nom: nom.trim(),
      description: description.trim() || null,
      dashboard,
      mode_sources: modeSource,
      max_sources_par_eleve: maxSources !== '' ? maxSources : null,
    };
    await supabase.from('projets').update(updates).eq('id', projet.id);
    onSave(updates);
    setSaving1(false); setSaved1(true);
    setTimeout(() => setSaved1(false), 2000);
  };

  // Save panneau 2
  const saveEleves = async () => {
    setSaving2(true);
    await supabase.from('projet_eleves').delete().eq('projet_id', projetId);
    const matricules = elevesSelectionnes.map(e => e.matricule);
    if (matricules.length > 0) {
      await supabase.from('projet_eleves').insert(
        matricules.map(matricule => ({ projet_id: projetId, matricule }))
      );
    }
    setSaving2(false); setSaved2(true);
    setTimeout(() => setSaved2(false), 2000);
  };

  // Save panneau 3
  const saveEquipe = async () => {
    setSaving3(true);
    await supabase.from('projet_acces_employees').delete().eq('projet_id', projetId);
    if (accesEmployees.length > 0) {
      await supabase.from('projet_acces_employees').insert(
        accesEmployees.map(e => ({ projet_id: projetId, employee_id: e.id, role: e.role, added_by: userId }))
      );
    }
    setSaving3(false); setSaved3(true);
    setTimeout(() => setSaved3(false), 2000);
  };

  const employeesFiltres = employees.filter(e => {
    const q = rechercheEmployee.toLowerCase();
    return !q || e.nom.toLowerCase().includes(q) || (e.prenom || '').toLowerCase().includes(q);
  });

  const classeEstPartielle = (c: string) =>
    classesSelectionnees.includes(c) &&
    elevesParClasse.filter(e => e.classe === c).some(e => exclus.includes(e.matricule));
  const groupeEstPartiel = (g: string) =>
    groupesSelectionnes.includes(g) && exclus.length > 0;

  return (
    <div className="space-y-6">

      {/* ── Panneau 1 : Infos générales ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">⚙️ Informations générales</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
          <input value={nom} onChange={e => setNom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard d'accès élèves</label>
          <div className="flex gap-3">
            {(['principal', 'sciences'] as const).map(d => (
              <button key={d} onClick={() => setDashboard(d)}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition ${
                  dashboard === d ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {d === 'principal' ? '🏠 Principal' : '🔬 Sciences'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mode sources</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'consultation_seule', label: 'Consultation seule' },
              { value: 'unique', label: 'Source unique' },
              { value: 'differentes', label: 'Sources différentes' },
              { value: 'libre', label: 'Libre' },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setModeSource(opt.value)}
                className={`text-left px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                  modeSource === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          {modeSource === 'libre' && (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-sm text-gray-600">Max. sources par élève :</label>
              <input type="number" min={1} value={maxSources}
                onChange={e => setMaxSources(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="illimité"
                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button onClick={saveInfos} disabled={saving1 || !nom.trim()}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              saved1 ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-50`}>
            {saving1 ? 'Enregistrement…' : saved1 ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Panneau 2 : Élèves ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">👥 Élèves du projet</h2>
        <p className="text-xs text-gray-500">
          Actuellement {elevesProjet.length} élève{elevesProjet.length > 1 ? 's' : ''} dans ce projet.
          Modifiez la sélection ci-dessous et enregistrez.
        </p>

        {/* Classes */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Ajouter par classe</h3>
          <input value={rechercheClasse} onChange={e => setRechercheClasse(e.target.value)}
            placeholder="Filtrer les classes…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
            {classesDisponibles
              .filter(c => c.value.toLowerCase().includes(rechercheClasse.toLowerCase()))
              .map(c => {
                const sel = classesSelectionnees.includes(c.value);
                const partiel = classeEstPartielle(c.value);
                return (
                  <button key={c.value} onClick={() => toggleClasse(c.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border-2 ${
                      sel && !partiel ? 'bg-green-500 text-white border-green-500' :
                      sel && partiel  ? 'bg-white text-green-700 border-green-500' :
                      'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
                    }`}>
                    {c.label}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Groupes */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Ajouter par groupe pédagogique</h3>
          <input value={rechercheGroupe} onChange={e => setRechercheGroupe(e.target.value)}
            placeholder="Filtrer les groupes…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            {groupesDisponibles
              .filter(g => g.value.toLowerCase().includes(rechercheGroupe.toLowerCase()))
              .map(g => {
                const sel = groupesSelectionnes.includes(g.value);
                const partiel = groupeEstPartiel(g.value);
                return (
                  <button key={g.value} onClick={() => toggleGroupe(g.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border-2 ${
                      sel && !partiel ? 'bg-blue-500 text-white border-blue-500' :
                      sel && partiel  ? 'bg-white text-blue-700 border-blue-500' :
                      'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                    }`}>
                    {g.label}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Recherche individuelle */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Ajouter individuellement</h3>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input type="text" placeholder="Nom" value={filtreNom} onChange={e => setFiltreNom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input type="text" placeholder="Prénom" value={filtrePrenom} onChange={e => setFiltrePrenom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input type="text" placeholder="Classe" value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          {rechercheIndividuelle.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-40 overflow-y-auto">
                {rechercheIndividuelle.map(eleve => (
                  <label key={eleve.matricule}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer">
                    <input type="checkbox"
                      checked={elevesIndividuels.some(e => e.matricule === eleve.matricule)}
                      onChange={() => toggleEleveIndividuel(eleve)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                    <span className="text-sm text-gray-900">{eleve.nom} {eleve.prenom}</span>
                    <span className="text-xs text-gray-400 ml-auto">{eleve.classe}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Récap */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Sélection actuelle
              <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {elevesSelectionnes.length}
              </span>
            </span>
            {(classesSelectionnees.length > 0 || groupesSelectionnes.length > 0 || elevesIndividuels.length > 0) && (
              <button onClick={() => { setClassesSelectionnees([]); setGroupesSelectionnes([]); setElevesIndividuels([]); setExclus([]); }}
                className="text-xs text-red-600 hover:text-red-700">
                Tout vider
              </button>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {elevesSelectionnes.map(e => (
              <div key={e.matricule} className="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-gray-100">
                <span className="text-sm text-gray-700">{e.nom} {e.prenom}</span>
                <span className="text-xs text-gray-400 mr-auto ml-2">{e.classe}</span>
                <button onClick={() => retirerEleve(e.matricule)} className="text-gray-300 hover:text-red-500 transition text-xs px-1">✕</button>
              </div>
            ))}
            {elevesSelectionnes.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">Aucun élève dans la sélection</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={saveEleves} disabled={saving2}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              saved2 ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-50`}>
            {saving2 ? 'Enregistrement…' : saved2 ? '✓ Enregistré' : 'Enregistrer les élèves'}
          </button>
        </div>
      </div>

      {/* ── Panneau 3 : Équipe ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">🧑‍🏫 Équipe pédagogique</h2>
        <div className="relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={rechercheEmployee} onChange={e => setRechercheEmployee(e.target.value)}
            placeholder="Rechercher un collègue…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {employeesFiltres.map(emp => {
            const sel = accesEmployees.find(e => e.id === emp.id);
            return (
              <div key={emp.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition cursor-pointer ${
                  sel ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => toggleEmployee(emp.id)}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    sel ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {sel ? '✓' : (emp.nom[0] || '?')}
                  </div>
                  <span className="text-sm text-gray-800">{emp.nom} {emp.prenom || emp.initiale}</span>
                </div>
                {sel && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {(['observateur', 'responsable'] as const).map(r => (
                      <button key={r} onClick={() => setRoleEmployee(emp.id, r)}
                        className={`px-2 py-0.5 text-xs rounded-full font-medium transition ${
                          sel.role === r
                            ? r === 'responsable' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {r === 'responsable' ? 'Co-responsable' : 'Observateur'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {accesEmployees.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">Récapitulatif :</p>
            <div className="flex flex-wrap gap-1.5">
              {accesEmployees.map(a => {
                const emp = employees.find(e => e.id === a.id);
                return (
                  <span key={a.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.role === 'responsable' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {emp?.nom} · {a.role === 'responsable' ? 'Co-resp.' : 'Obs.'}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={saveEquipe} disabled={saving3}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              saved3 ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-50`}>
            {saving3 ? 'Enregistrement…' : saved3 ? '✓ Enregistré' : 'Enregistrer l\'équipe'}
          </button>
        </div>
      </div>

    </div>
  );
}