'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Facture {
  consommation_annuelle_kwh: number | null;
  bihoraire: boolean;
  consommation_jour_kwh: number | null;
  consommation_nuit_kwh: number | null;
  prix_kwh: number | null;
  students: { classe: string; niveau: string } | null;
}

interface Appareil {
  source: string;
  nom_appareil: string;
  categorie: string;
  puissance_w: number | null;
  energie_kwh: number | null;
  duree_mesure_min: number | null;
  notes: string | null;
  students: { classe: string } | null;
}

const CATEGORIES_ORDER = [
  { value: 'chauffage', label: '🔥 Chauffage & clim' },
  { value: 'froid', label: '🧊 Froid alimentaire' },
  { value: 'lavage', label: '🫧 Lavage' },
  { value: 'cuisson', label: '🍳 Cuisson' },
  { value: 'info_av', label: '🖥️ Informatique & AV' },
  { value: 'eclairage', label: '💡 Éclairage' },
  { value: 'charge', label: '🔋 Charge' },
  { value: 'hygiene', label: '🚿 Hygiène & confort' },
  { value: 'autre', label: '📦 Autre' },
];

function avg(arr: number[]) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function median(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function round(v: number | null, d = 0) {
  if (v == null) return '–';
  return v.toFixed(d);
}

function StatCard({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}<span className="text-base font-normal text-gray-500 ml-1">{unit}</span></p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, color = 'bg-blue-400' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-12 text-right">{value} W</span>
    </div>
  );
}

export default function VueGroupee({ isTeacher }: { isTeacher: boolean }) {
  const [tab, setTab] = useState<'factures' | 'appareils'>('factures');
  const [factures, setFactures] = useState<Facture[]>([]);
  const [appareils, setAppareils] = useState<Appareil[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [fRes, aRes] = await Promise.all([
        supabase
          .from('cite_factures')
          .select('*, students(classe, niveau)')
          .order('consommation_annuelle_kwh', { ascending: true }),
        supabase
          .from('cite_appareils')
          .select('*, students(classe)')
          .order('puissance_w', { ascending: false }),
      ]);
      setFactures(fRes.data ?? []);
      setAppareils(aRes.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Chargement des données...</div>;

  // ---- Factures stats ----
  const consosAnn = factures.map(f => f.consommation_annuelle_kwh).filter((v): v is number => v != null);
  const prixArr = factures.map(f => f.prix_kwh).filter((v): v is number => v != null);
  const bihoraireCount = factures.filter(f => f.bihoraire).length;

  const avgConso = avg(consosAnn);
  const medConso = median(consosAnn);
  const avgPrix = avg(prixArr);

  // Distribution en tranches de 1000 kWh
  const buckets: Record<string, number> = {};
  consosAnn.forEach(v => {
    const b = Math.floor(v / 1000) * 1000;
    const key = `${b}–${b + 999}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  });
  const maxBucket = Math.max(...Object.values(buckets), 1);

  // ---- Appareils groupés ----
  const grouped: Record<string, Appareil[]> = {};
  appareils.forEach(a => {
    if (!grouped[a.categorie]) grouped[a.categorie] = [];
    grouped[a.categorie].push(a);
  });

  const getCatAvgPower = (items: Appareil[]) => {
    const vals = items.map(i => i.puissance_w).filter((v): v is number => v != null);
    return avg(vals);
  };

  const maxPower = Math.max(...appareils.map(a => a.puissance_w ?? 0), 1);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">
        {factures.length} facture{factures.length > 1 ? 's' : ''} · {appareils.length} appareil{appareils.length > 1 ? 's' : ''} enregistrés
        {isTeacher && <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">Vue enseignant</span>}
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {(['factures', 'appareils'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'factures' ? '📄 Factures' : '🔌 Appareils'}
          </button>
        ))}
      </div>

      {/* ===== FACTURES ===== */}
      {tab === 'factures' && (
        <div>
          {factures.length === 0 ? (
            <p className="text-gray-400 italic text-sm">Aucune facture enregistrée pour le moment.</p>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <StatCard label="Réponses" value={String(factures.length)} sub={`dont ${bihoraireCount} bihoraires`} />
                <StatCard label="Moyenne annuelle" value={round(avgConso, 0)} unit="kWh" sub="par ménage" />
                <StatCard label="Médiane annuelle" value={round(medConso, 0)} unit="kWh" sub="valeur centrale" />
                <StatCard label="Prix moyen" value={round(avgPrix, 3)} unit="€/kWh" sub={`${prixArr.length} réponses`} />
              </div>

              {/* Contexte belge */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                <strong>Repères belges :</strong> Un ménage moyen en Belgique consomme ~3 500 kWh/an.
                Le prix de l'électricité varie selon le fournisseur et la région (typiquement 0.25 – 0.35 €/kWh tout compris).
              </div>

              {/* Distribution histogram */}
              <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                Distribution des consommations annuelles
              </h3>
              {Object.keys(buckets).length === 0 ? (
                <p className="text-gray-400 text-sm italic">Données insuffisantes.</p>
              ) : (
                <div className="space-y-2 mb-8">
                  {Object.entries(buckets)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([label, count]) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label} kWh</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                          <div
                            className="bg-blue-400 h-5 rounded-full transition-all"
                            style={{ width: `${Math.round((count / maxBucket) * 100)}%` }}
                          />
                          <span className="absolute right-2 top-0.5 text-xs text-gray-600 font-medium">
                            {count} ménage{count > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Détail bihoraire */}
              {bihoraireCount > 0 && (() => {
                const jourArr = factures.map(f => f.consommation_jour_kwh).filter((v): v is number => v != null);
                const nuitArr = factures.map(f => f.consommation_nuit_kwh).filter((v): v is number => v != null);
                const avgJour = avg(jourArr);
                const avgNuit = avg(nuitArr);
                if (!avgJour && !avgNuit) return null;
                const total = (avgJour ?? 0) + (avgNuit ?? 0);
                const pctJour = total > 0 ? Math.round(((avgJour ?? 0) / total) * 100) : 50;
                return (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                      Répartition jour / nuit (compteurs bihoraires)
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12">Jour</span>
                      <div className="flex-1 flex rounded-full overflow-hidden h-6">
                        <div className="bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900"
                          style={{ width: `${pctJour}%` }}>
                          {pctJour}%
                        </div>
                        <div className="bg-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-900"
                          style={{ width: `${100 - pctJour}%` }}>
                          {100 - pctJour}%
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-12">Nuit</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Moy. jour : {round(avgJour, 0)} kWh · Moy. nuit : {round(avgNuit, 0)} kWh (sur {bihoraireCount} ménages)
                    </p>
                  </div>
                );
              })()}

              {/* Table détaillée (profs seulement) */}
              {isTeacher && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    📋 Détail par élève (vue enseignant)
                  </summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left">Classe</th>
                          <th className="px-3 py-2 text-right">Conso. ann. (kWh)</th>
                          <th className="px-3 py-2 text-center">Bihoraire</th>
                          <th className="px-3 py-2 text-right">Jour (kWh)</th>
                          <th className="px-3 py-2 text-right">Nuit (kWh)</th>
                          <th className="px-3 py-2 text-right">Prix (€/kWh)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factures.map((f, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-1.5">{f.students?.classe ?? '–'}</td>
                            <td className="px-3 py-1.5 text-right">{f.consommation_annuelle_kwh ?? '–'}</td>
                            <td className="px-3 py-1.5 text-center">{f.bihoraire ? '✓' : ''}</td>
                            <td className="px-3 py-1.5 text-right">{f.consommation_jour_kwh ?? '–'}</td>
                            <td className="px-3 py-1.5 text-right">{f.consommation_nuit_kwh ?? '–'}</td>
                            <td className="px-3 py-1.5 text-right">{f.prix_kwh ?? '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== APPAREILS ===== */}
      {tab === 'appareils' && (
        <div>
          {appareils.length === 0 ? (
            <p className="text-gray-400 italic text-sm">Aucun appareil enregistré pour le moment.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <StatCard label="Mesures totales" value={String(appareils.length)} />
                <StatCard
                  label="Via wattmètre"
                  value={String(appareils.filter(a => a.source === 'wattmetre').length)}
                  sub={`${appareils.filter(a => a.source === 'recherche').length} via recherche`}
                />
                <StatCard label="Catégories" value={String(Object.keys(grouped).length)} />
              </div>

              {/* Par catégorie */}
              <div className="space-y-6">
                {CATEGORIES_ORDER.filter(cat => grouped[cat.value]).map(cat => {
                  const items = grouped[cat.value];
                  const avgP = getCatAvgPower(items);
                  const withPower = items.filter(i => i.puissance_w != null);

                  return (
                    <div key={cat.value} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-800">{cat.label}</span>
                          <span className="ml-2 text-xs text-gray-400">{items.length} mesure{items.length > 1 ? 's' : ''}</span>
                        </div>
                        {avgP != null && (
                          <span className="text-sm font-medium text-gray-600">
                            moy. <strong>{Math.round(avgP)} W</strong>
                          </span>
                        )}
                      </div>

                      <div className="divide-y divide-gray-50">
                        {items.map((a, i) => (
                          <div key={i} className="px-4 py-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-800">{a.nom_appareil}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  a.source === 'wattmetre'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {a.source === 'wattmetre' ? '⚡' : '🔍'}
                                </span>
                                {isTeacher && a.students?.classe && (
                                  <span className="text-xs text-gray-400">{a.students.classe}</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 flex gap-3">
                                {a.energie_kwh != null && (
                                  <span>{a.energie_kwh} kWh{a.duree_mesure_min ? `/${a.duree_mesure_min}min` : ''}</span>
                                )}
                              </div>
                            </div>
                            {a.puissance_w != null && (
                              <MiniBar value={a.puissance_w} max={maxPower} />
                            )}
                            {a.notes && (
                              <p className="text-xs text-gray-400 italic mt-1">{a.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Synthèse puissances */}
                      {withPower.length > 1 && (
                        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                          Min : {Math.min(...withPower.map(i => i.puissance_w!))} W ·
                          Max : {Math.max(...withPower.map(i => i.puissance_w!))} W ·
                          Médiane : {round(median(withPower.map(i => i.puissance_w!)), 0)} W
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Catégories non listées */}
                {Object.keys(grouped)
                  .filter(k => !CATEGORIES_ORDER.find(c => c.value === k))
                  .map(cat => {
                    const items = grouped[cat];
                    return (
                      <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3">
                          <span className="font-semibold text-gray-800">📦 {cat}</span>
                          <span className="ml-2 text-xs text-gray-400">{items.length} mesure{items.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {items.map((a, i) => (
                            <div key={i} className="px-4 py-2.5 text-sm">
                              <span className="text-gray-800">{a.nom_appareil}</span>
                              {a.puissance_w != null && <span className="text-gray-500 ml-2">{a.puissance_w} W</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}