'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Projet {
  id: string; nom: string; description: string | null;
  consignes: string | null; mode_sources: string;
  max_sources_par_eleve: number | null; statut: string;
}
interface Objectif {
  id: string; titre: string; description: string | null;
  echeance: string | null; ordre: number;
}
interface SousGroupe {
  id: string; nom: string; description: string | null;
}
interface Source {
  id: string; titre: string; auteur: string | null; url: string | null;
  description: string | null; sous_groupes_cibles: string[] | null; ordre: number;
}

type TabId = 'objectifs' | 'consignes' | 'sources';

function isUrl(s: string) {
  try { new URL(s); return true; } catch { return false; }
}

function echeanceBadge(echeance: string | null): { label: string; cls: string } | null {
  if (!echeance) return null;
  const diff = Math.ceil((new Date(echeance).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { label: 'Dépassée', cls: 'bg-red-100 text-red-700' };
  if (diff === 0) return { label: "Aujourd'hui !", cls: 'bg-orange-100 text-orange-700' };
  if (diff <= 3)  return { label: `${diff} jour${diff > 1 ? 's' : ''}`, cls: 'bg-amber-100 text-amber-700' };
  return { label: `${diff} jours`, cls: 'bg-green-100 text-green-700' };
}

export default function ProjetElevePage() {
  const router = useRouter();
  const params = useParams();
  const projetId = params.id as string;

  const [matricule, setMatricule] = useState<number | null>(null);
  const [projet, setProjet] = useState<Projet | null>(null);
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [mesSousGroupes, setMesSousGroupes] = useState<SousGroupe[]>([]);
  const [sourcesParGroupe, setSourcesParGroupe] = useState<Record<string, Source[]>>({});
  const [sourcesGlobales, setSourcesGlobales] = useState<Source[]>([]);
  const [mesAttributions, setMesAttributions] = useState<string[]>([]);
  const [sourcesDisponibles, setSourcesDisponibles] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>('objectifs');

  useEffect(() => {
    const type = localStorage.getItem('userType');
    const id = localStorage.getItem('userId');
    if (!id || type !== 'student') { router.push('/'); return; }
    const mat = parseInt(id);
    setMatricule(mat);
    charger(mat);
  }, [router, projetId]);

  const charger = useCallback(async (mat: number) => {
    setLoading(true);
    try {
      const { data: p } = await supabase.from('projets')
        .select('id, nom, description, consignes, mode_sources, max_sources_par_eleve, statut')
        .eq('id', projetId).single();
      if (!p || p.statut !== 'actif') { router.push('/dashboard'); return; }
      setProjet(p);

      // Vérification accès via projet_eleves
      const { data: eleveData } = await supabase
        .from('projet_eleves').select('matricule')
        .eq('projet_id', projetId).eq('matricule', mat).single();
      if (!eleveData) { router.push('/dashboard'); return; }

      // Objectifs
      const { data: obj } = await supabase.from('projet_objectifs')
        .select('*').eq('projet_id', projetId).order('ordre');
      setObjectifs(obj || []);

      // Mes sous-groupes
      const { data: sgData } = await supabase
        .from('projet_sous_groupe_membres')
        .select('sous_groupe_id, projet_sous_groupes!inner(id, nom, description, projet_id)')
        .eq('eleve_matricule', mat);

      const mesSG: SousGroupe[] = (sgData || [])
        .map((s: any) => s.projet_sous_groupes)
        .filter((sg: any) => sg && sg.projet_id === projetId);
      setMesSousGroupes(mesSG);
      const mesSGIds = mesSG.map((sg: any) => sg.id);

      // Sources
      const { data: srcAll } = await supabase.from('projet_sources')
        .select('*').eq('projet_id', projetId).order('ordre');
      const allSources: Source[] = srcAll || [];

      const globales = allSources.filter(s => !s.sous_groupes_cibles || s.sous_groupes_cibles.length === 0);
      const parGroupe: Record<string, Source[]> = {};
      mesSGIds.forEach(sgId => {
        parGroupe[sgId] = allSources.filter(s =>
          s.sous_groupes_cibles && s.sous_groupes_cibles.includes(sgId)
        );
      });
      setSourcesGlobales(globales);
      setSourcesParGroupe(parGroupe);

      const dispo = [...globales];
      mesSGIds.forEach(sgId => {
        (parGroupe[sgId] || []).forEach(s => {
          if (!dispo.find(d => d.id === s.id)) dispo.push(s);
        });
      });
      setSourcesDisponibles(dispo);

      // Mes attributions
      if (allSources.length > 0) {
        const { data: attr } = await supabase
          .from('projet_source_attributions').select('source_id')
          .eq('eleve_matricule', mat)
          .in('source_id', allSources.map(s => s.id));
        setMesAttributions((attr || []).map((a: any) => a.source_id));
      }

      // Tab par défaut : objectifs si présents, sinon consignes, sinon sources
      if ((obj || []).length > 0) setTab('objectifs');
      else if (p.consignes) setTab('consignes');
      else setTab('sources');

    } finally {
      setLoading(false);
    }
  }, [projetId, router]);

  const toggleSource = async (sourceId: string) => {
    if (!matricule || !projet) return;
    const mode = projet.mode_sources;
    if (mode === 'consultation_seule') return;

    const deja = mesAttributions.includes(sourceId);

    if (deja) {
      setSaving(true);
      await supabase.from('projet_source_attributions')
        .delete().eq('source_id', sourceId).eq('eleve_matricule', matricule);
      setMesAttributions(prev => prev.filter(id => id !== sourceId));
      setSaving(false);
      return;
    }

    // Vérifier limite
    if (mode === 'unique' && mesAttributions.length >= 1) {
      alert('Vous ne pouvez choisir qu\'une seule source. Retirez d\'abord votre sélection actuelle.');
      return;
    }
    if (projet.max_sources_par_eleve !== null && mesAttributions.length >= projet.max_sources_par_eleve) {
      alert(`Vous ne pouvez choisir que ${projet.max_sources_par_eleve} source${projet.max_sources_par_eleve > 1 ? 's' : ''}.`);
      return;
    }
    if (mode === 'differentes') {
      const { data } = await supabase.from('projet_source_attributions')
        .select('eleve_matricule').eq('source_id', sourceId);
      if (data && data.length > 0) {
        alert('Cette source est déjà prise par un autre élève.');
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase.from('projet_source_attributions').insert({
      source_id: sourceId, eleve_matricule: matricule,
    });
    if (!error) setMesAttributions(prev => [...prev, sourceId]);
    setSaving(false);
  };

  const canChoose = projet?.mode_sources !== 'consultation_seule';

  const modeLabel: Record<string, string> = {
    unique:      'Choisissez une source à examiner et synthétiser.',
    differentes: 'Choisissez une source à examiner et synthétiser (chaque source ne peut être prise que par un seul élève).',
    libre:       'Choisissez une ou plusieurs sources.',
  };

  // Tabs disponibles selon le contenu
  const tabs: { id: TabId; label: string; icon: string }[] = [
    ...(objectifs.length > 0 ? [{ id: 'objectifs' as TabId, label: 'Objectifs', icon: '🎯' }] : []),
    ...(projet?.consignes ? [{ id: 'consignes' as TabId, label: 'Consignes', icon: '📋' }] : []),
    { id: 'sources', label: 'Sources', icon: '📚' },
  ];

  if (loading || !projet) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-4">Chargement…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-md">
        <h1 className="text-xl font-bold mb-1">🏛️ {projet.nom}</h1>
        {projet.description && <p className="text-indigo-100 text-sm">{projet.description}</p>}
        {mesSousGroupes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {mesSousGroupes.map(sg => (
              <span key={sg.id} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
                {sg.nom}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px ${
              tab === t.id
                ? 'text-indigo-700 border-indigo-500 bg-indigo-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Objectifs ── */}
      {tab === 'objectifs' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {objectifs.map((obj, i) => {
              const badge = echeanceBadge(obj.echeance);
              return (
                <div key={obj.id} className="px-5 py-4 flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{obj.titre}</p>
                    {obj.description && <p className="text-xs text-gray-500 mt-0.5">{obj.description}</p>}
                    {obj.echeance && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">
                          {new Date(obj.echeance).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        {badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Consignes ── */}
      {tab === 'consignes' && projet.consignes && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
            {projet.consignes}
          </pre>
        </div>
      )}

      {/* ── Sources ── */}
      {tab === 'sources' && (
        <div className="space-y-4">

          {/* Instruction mode */}
          {canChoose && modeLabel[projet.mode_sources] && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-700">
              💡 {modeLabel[projet.mode_sources]}
              {projet.mode_sources === 'unique' && mesAttributions.length >= 1 && (
                <span className="ml-2 font-medium text-indigo-900">Vous avez déjà fait votre choix.</span>
              )}
            </div>
          )}

          {/* Sources de mes sous-groupes */}
          {mesSousGroupes.map(sg => {
            const sourcesDuGroupe = sourcesParGroupe[sg.id] || [];
            if (sourcesDuGroupe.length === 0) return null;
            return (
              <div key={sg.id} className="bg-white rounded-xl border-2 border-indigo-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                  <span className="text-sm font-semibold text-indigo-900">{sg.nom}</span>
                  {sg.description && <span className="text-sm text-indigo-600 ml-2">— {sg.description}</span>}
                </div>
                <div className="p-4">
                  <SourcesList
                    sources={sourcesDuGroupe}
                    mesAttributions={mesAttributions}
                    canChoose={canChoose}
                    saving={saving}
                    onToggle={toggleSource}
                    maxAtteint={
                      projet.mode_sources === 'unique' || projet.mode_sources === 'differentes'
                        ? mesAttributions.length >= 1
                        : projet.max_sources_par_eleve !== null
                        ? mesAttributions.length >= projet.max_sources_par_eleve
                        : false
                    }
                  />
                </div>
              </div>
            );
          })}

          {/* Sources globales */}
          {sourcesGlobales.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Sources générales</span>
              </div>
              <div className="p-4">
                <SourcesList
                  sources={sourcesGlobales}
                  mesAttributions={mesAttributions}
                  canChoose={canChoose}
                  saving={saving}
                  onToggle={toggleSource}
                  maxAtteint={
                    projet.mode_sources === 'unique' ? mesAttributions.length >= 1 :
                    projet.max_sources_par_eleve !== null ? mesAttributions.length >= projet.max_sources_par_eleve :
                    false
                  }
                />
              </div>
            </div>
          )}

          {/* Récap sélection */}
          {canChoose && mesAttributions.length > 0 && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 px-5 py-4">
              <p className="text-sm font-semibold text-indigo-800 mb-2">
                ✅ Ma sélection ({mesAttributions.length} source{mesAttributions.length > 1 ? 's' : ''})
              </p>
              <div className="space-y-1">
                {sourcesDisponibles
                  .filter(s => mesAttributions.includes(s.id))
                  .map(s => (
                    <p key={s.id} className="text-sm text-indigo-700">• {s.titre}</p>
                  ))}
              </div>
            </div>
          )}

          {sourcesDisponibles.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">Aucune source disponible pour le moment</p>
            </div>
          )}
        </div>
      )}

    </main>
  );
}

// ── Liste de sources ───────────────────────────────────────
function SourcesList({ sources, mesAttributions, canChoose, saving, onToggle, maxAtteint }: {
  sources: Source[];
  mesAttributions: string[];
  canChoose: boolean;
  saving: boolean;
  onToggle: (id: string) => void;
  maxAtteint: boolean;
}) {
  return (
    <div className="space-y-2">
      {sources.map(src => {
        const choisie = mesAttributions.includes(src.id);
        const disabled = canChoose && !choisie && maxAtteint;
        return (
          <div key={src.id}
            onClick={canChoose && !disabled ? () => onToggle(src.id) : undefined}
            className={`rounded-lg border p-3.5 transition ${
              canChoose && !disabled ? 'cursor-pointer' : ''
            } ${
              choisie   ? 'border-indigo-400 bg-indigo-50' :
              disabled  ? 'border-gray-100 bg-gray-50 opacity-50' :
              canChoose ? 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50' :
              'border-gray-200'
            }`}>
            <div className="flex items-start gap-3">
              {canChoose && (
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  choisie ? 'bg-indigo-500 border-indigo-500' :
                  disabled ? 'border-gray-200' : 'border-gray-300'
                }`}>
                  {choisie && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${choisie ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {src.titre}
                </p>
                {src.auteur && <p className="text-xs text-gray-400 mt-0.5">{src.auteur}</p>}
                {src.description && <p className="text-xs text-gray-500 mt-1">{src.description}</p>}
                {src.url && isUrl(src.url) && (
                    <a href={src.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => { e.stopPropagation(); window.open(src.url!, '_blank'); e.preventDefault(); }}
                      className="text-xs text-indigo-600 hover:underline mt-1 flex items-center gap-1"
                    >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Consulter la source
                  </a>
                )}
              </div>
              {choisie && (
                <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                  Ma source
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}