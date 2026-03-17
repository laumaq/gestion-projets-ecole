'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Facture {
  student_id: number;
  consommation_annuelle_kwh: number | null;
  bihoraire: boolean;
  consommation_jour_kwh: number | null;
  consommation_nuit_kwh: number | null;
  prix_kwh: number | null;
  nb_personnes: number | null;
  students: { nom: string; prenom: string; classe: string; niveau: string } | null;
}

interface Appareil {
  student_id: number;
  source: string;
  nom_appareil: string;
  categorie: string;
  puissance_w: number | null;
  energie_kwh: number | null;
  duree_mesure_min: number | null;
  notes: string | null;
  students: { nom: string; prenom: string; classe: string } | null;
}

// Élève reconstitué pour la vue par élève
interface EleveData {
  student_id: number;
  nom: string;
  prenom: string;
  classe: string;
  facture: Facture | null;
  appareils: Appareil[];
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
      <p className="text-2xl font-bold text-gray-800">
        {value}<span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
      </p>
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

// ── Vue par élève ──────────────────────────────────────────────────────────────

function VueParEleve({ eleves }: { eleves: EleveData[] }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'nom' | 'classe' | 'conso'>('classe');

  const filtered = eleves
    .filter(e => {
      const q = search.toLowerCase();
      return (
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        e.classe.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
      if (sortBy === 'classe') return a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom);
      // tri par conso : les sans données à la fin
      const ca = a.facture?.consommation_annuelle_kwh ?? Infinity;
      const cb = b.facture?.consommation_annuelle_kwh ?? Infinity;
      return ca - cb;
    });

  const avecFacture = eleves.filter(e => e.facture).length;
  const avecAppareils = eleves.filter(e => e.appareils.length > 0).length;

  return (
    <div>
      {/* Résumé de complétion */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Élèves dans la liste" value={String(eleves.length)} />
        <StatCard
          label="Facture remplie"
          value={String(avecFacture)}
          sub={`${eleves.length - avecFacture} manquant${eleves.length - avecFacture > 1 ? 's' : ''}`}
        />
        <StatCard
          label="Appareils renseignés"
          value={String(avecAppareils)}
          sub={`${eleves.length - avecAppareils} sans appareil`}
        />
      </div>

      {/* Barre de progression globale */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <p className="text-xs text-gray-500 mb-2">Complétion globale</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden flex">
            <div
              className="bg-blue-400 h-3 transition-all"
              style={{ width: `${Math.round((avecFacture / Math.max(eleves.length, 1)) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 w-12 text-right">
            {Math.round((avecFacture / Math.max(eleves.length, 1)) * 100)}%
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Factures : {avecFacture}/{eleves.length}</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher un élève ou une classe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1 min-w-40"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="classe">Trier par classe</option>
          <option value="nom">Trier par nom</option>
          <option value="conso">Trier par consommation</option>
        </select>
      </div>

      {/* Liste des élèves */}
      <div className="space-y-2">
        {filtered.map(eleve => {
          const isOpen = expanded === eleve.student_id;
          const f = eleve.facture;
          const hasData = f || eleve.appareils.length > 0;

          return (
            <div
              key={eleve.student_id}
              className={`border rounded-xl overflow-hidden transition-all ${
                hasData ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-60'
              }`}
            >
              {/* Ligne résumé */}
              <button
                onClick={() => setExpanded(isOpen ? null : eleve.student_id)}
                className="w-full flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
              >
                {/* Indicateurs de complétion */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${f ? 'bg-blue-400' : 'bg-gray-200'}`}
                    title={f ? 'Facture remplie' : 'Facture manquante'}
                  />
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${eleve.appareils.length > 0 ? 'bg-orange-400' : 'bg-gray-200'}`}
                    title={eleve.appareils.length > 0 ? `${eleve.appareils.length} appareil(s)` : 'Aucun appareil'}
                  />
                </div>

                {/* Nom + classe */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-gray-800">
                    {eleve.prenom} {eleve.nom}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">{eleve.classe}</span>
                </div>

                {/* Résumé inline */}
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                  {f?.consommation_annuelle_kwh != null ? (
                    <span className="font-medium text-blue-600">{f.consommation_annuelle_kwh} kWh</span>
                  ) : (
                    <span className="text-gray-300">– kWh</span>
                  )}
                  <span>{eleve.appareils.length} appareil{eleve.appareils.length > 1 ? 's' : ''}</span>
                  <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Détail déplié */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 grid md:grid-cols-2 gap-6">

                  {/* Facture */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                      📄 Facture
                    </h4>
                    {f ? (
                      <dl className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Personnes dans le foyer</dt>
                          <dd className="font-medium text-gray-800">
                            {f.nb_personnes != null ? `${f.nb_personnes}` : '–'}
                          </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Conso. annuelle</dt>
                          <dd className="font-medium text-gray-800">
                            {f.consommation_annuelle_kwh != null ? `${f.consommation_annuelle_kwh} kWh` : '–'}
                          </dd>
                        </div>
                        {f.consommation_annuelle_kwh != null && f.nb_personnes != null && f.nb_personnes > 0 && (
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-500">Conso. / personne</dt>
                            <dd className="font-medium text-blue-600">
                              {Math.round(f.consommation_annuelle_kwh / f.nb_personnes)} kWh/an
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Compteur bihoraire</dt>
                          <dd className="font-medium text-gray-800">{f.bihoraire ? 'Oui' : 'Non'}</dd>
                        </div>
                        {f.bihoraire && (
                          <>
                            <div className="flex justify-between text-sm">
                              <dt className="text-gray-500">Jour</dt>
                              <dd className="font-medium text-gray-800">
                                {f.consommation_jour_kwh != null ? `${f.consommation_jour_kwh} kWh` : '–'}
                              </dd>
                            </div>
                            <div className="flex justify-between text-sm">
                              <dt className="text-gray-500">Nuit</dt>
                              <dd className="font-medium text-gray-800">
                                {f.consommation_nuit_kwh != null ? `${f.consommation_nuit_kwh} kWh` : '–'}
                              </dd>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Prix/kWh</dt>
                          <dd className="font-medium text-gray-800">
                            {f.prix_kwh != null ? `${f.prix_kwh} €` : '–'}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Facture non remplie.</p>
                    )}
                  </div>

                  {/* Appareils */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                      🔌 Appareils ({eleve.appareils.length})
                    </h4>
                    {eleve.appareils.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Aucun appareil renseigné.</p>
                    ) : (
                      <div className="space-y-2">
                        {eleve.appareils.map((a, i) => (
                          <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-800">{a.nom_appareil}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  a.source === 'wattmetre'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {a.source === 'wattmetre' ? '⚡' : '🔍'}
                                </span>
                              </div>
                              {a.puissance_w != null && (
                                <span className="text-xs font-medium text-gray-600">{a.puissance_w} W</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {CATEGORIES_ORDER.find(c => c.value === a.categorie)?.label ?? a.categorie}
                              {a.energie_kwh != null && ` · ${a.energie_kwh} kWh`}
                              {a.notes && ` · ${a.notes}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucun élève trouvé.</p>
        )}
      </div>

      {/* Légende */}
      <div className="mt-4 flex gap-4 text-xs text-gray-400">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 mr-1" />Facture remplie</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 mr-1" />Appareils renseignés</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-200 mr-1" />Données manquantes</span>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function VueGroupee({ isTeacher }: { isTeacher: boolean }) {
  const [tab, setTab] = useState<'factures' | 'appareils' | 'eleves'>('factures');
  const [factures, setFactures] = useState<Facture[]>([]);
  const [appareils, setAppareils] = useState<Appareil[]>([]);
  const [eleves, setEleves] = useState<EleveData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [fRes, aRes] = await Promise.all([
        supabase
          .from('cite_factures')
          .select('*, students(nom, prenom, classe, niveau)')
          .order('consommation_annuelle_kwh', { ascending: true }),
        supabase
          .from('cite_appareils')
          .select('*, students(nom, prenom, classe)')
          .order('puissance_w', { ascending: false }),
      ]);

      const facturesData: Facture[] = fRes.data ?? [];
      const appareilsData: Appareil[] = aRes.data ?? [];

      setFactures(facturesData);
      setAppareils(appareilsData);

      // Reconstituer la liste par élève
      // On consolide tous les student_id connus (factures + appareils)
      const allIds = new Set<number>([
        ...facturesData.map(f => f.student_id),
        ...appareilsData.map(a => a.student_id),
      ]);

      const factureMap = new Map(facturesData.map(f => [f.student_id, f]));
      const appareilsMap = new Map<number, Appareil[]>();
      appareilsData.forEach(a => {
        if (!appareilsMap.has(a.student_id)) appareilsMap.set(a.student_id, []);
        appareilsMap.get(a.student_id)!.push(a);
      });

      const elevesData: EleveData[] = Array.from(allIds).map(id => {
        const f = factureMap.get(id) ?? null;
        const apps = appareilsMap.get(id) ?? [];
        // Récupérer le nom depuis la facture ou le premier appareil
        const studentInfo = f?.students ?? apps[0]?.students ?? null;
        return {
          student_id: id,
          nom: studentInfo?.nom ?? '?',
          prenom: studentInfo?.prenom ?? '?',
          classe: studentInfo?.classe ?? '?',
          facture: f,
          appareils: apps,
        };
      }).sort((a, b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom));

      setEleves(elevesData);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Chargement des données...</div>;

  // ---- Stats factures ----
  const consosAnn = factures.map(f => f.consommation_annuelle_kwh).filter((v): v is number => v != null);
  const prixArr = factures.map(f => f.prix_kwh).filter((v): v is number => v != null);
  const bihoraireCount = factures.filter(f => f.bihoraire).length;
  const avgConso = avg(consosAnn);
  const medConso = median(consosAnn);
  const avgPrix = avg(prixArr);

  // Conso par personne (uniquement pour les foyers ayant renseigné les deux champs)
  const consosParPersonne = factures
    .filter(f => f.consommation_annuelle_kwh != null && f.nb_personnes != null && f.nb_personnes > 0)
    .map(f => f.consommation_annuelle_kwh! / f.nb_personnes!);
  const avgConsoParPersonne = avg(consosParPersonne);
  const medConsoParPersonne = median(consosParPersonne);

  const nbPersonnesArr = factures.map(f => f.nb_personnes).filter((v): v is number => v != null);
  const avgNbPersonnes = avg(nbPersonnesArr);

  const buckets: Record<string, number> = {};
  consosAnn.forEach(v => {
    const b = Math.floor(v / 1000) * 1000;
    const key = `${b}–${b + 999}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  });
  const maxBucket = Math.max(...Object.values(buckets), 1);

  // ---- Stats appareils ----
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

  const TABS = [
    { key: 'factures', label: '📄 Factures' },
    { key: 'appareils', label: '🔌 Appareils' },
    ...(isTeacher ? [{ key: 'eleves', label: '👤 Par élève' }] : []),
  ] as const;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">
        {factures.length} facture{factures.length > 1 ? 's' : ''} · {appareils.length} appareil{appareils.length > 1 ? 's' : ''} enregistrés
        {isTeacher && <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">Vue enseignant</span>}
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatCard label="Réponses" value={String(factures.length)} sub={`dont ${bihoraireCount} bihoraires`} />
                <StatCard label="Moyenne annuelle" value={round(avgConso, 0)} unit="kWh" sub="par ménage" />
                <StatCard label="Médiane annuelle" value={round(medConso, 0)} unit="kWh" sub="valeur centrale" />
                <StatCard label="Prix moyen" value={round(avgPrix, 3)} unit="€/kWh" sub={`${prixArr.length} réponses`} />
              </div>

              {/* Conso par personne — uniquement si des données nb_personnes existent */}
              {consosParPersonne.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                  <StatCard
                    label="Taille moyenne du foyer"
                    value={round(avgNbPersonnes, 1)}
                    unit="pers."
                    sub={`${nbPersonnesArr.length} réponses`}
                  />
                  <StatCard
                    label="Conso moyenne / personne"
                    value={round(avgConsoParPersonne, 0)}
                    unit="kWh/an"
                    sub={`${consosParPersonne.length} foyers`}
                  />
                  <StatCard
                    label="Conso médiane / personne"
                    value={round(medConsoParPersonne, 0)}
                    unit="kWh/an"
                    sub="valeur centrale"
                  />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                <strong>Repères belges :</strong> Un ménage moyen en Belgique consomme ~3 500 kWh/an.
                Le prix de l'électricité varie selon le fournisseur et la région (typiquement 0.25 – 0.35 €/kWh tout compris).
              </div>

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

              {isTeacher && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    📋 Détail par élève (vue enseignant)
                  </summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left">Élève</th>
                          <th className="px-3 py-2 text-left">Classe</th>
                          <th className="px-3 py-2 text-right">Personnes</th>
                          <th className="px-3 py-2 text-right">Conso. ann. (kWh)</th>
                          <th className="px-3 py-2 text-right">kWh/pers.</th>
                          <th className="px-3 py-2 text-center">Bihoraire</th>
                          <th className="px-3 py-2 text-right">Jour (kWh)</th>
                          <th className="px-3 py-2 text-right">Nuit (kWh)</th>
                          <th className="px-3 py-2 text-right">Prix (€/kWh)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factures.map((f, i) => {
                          const consoParP = (f.consommation_annuelle_kwh != null && f.nb_personnes != null && f.nb_personnes > 0)
                            ? Math.round(f.consommation_annuelle_kwh / f.nb_personnes)
                            : null;
                          return (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-1.5">{f.students ? `${f.students.prenom} ${f.students.nom}` : '–'}</td>
                              <td className="px-3 py-1.5">{f.students?.classe ?? '–'}</td>
                              <td className="px-3 py-1.5 text-right">{f.nb_personnes ?? '–'}</td>
                              <td className="px-3 py-1.5 text-right">{f.consommation_annuelle_kwh ?? '–'}</td>
                              <td className="px-3 py-1.5 text-right">{consoParP ?? '–'}</td>
                              <td className="px-3 py-1.5 text-center">{f.bihoraire ? '✓' : ''}</td>
                              <td className="px-3 py-1.5 text-right">{f.consommation_jour_kwh ?? '–'}</td>
                              <td className="px-3 py-1.5 text-right">{f.consommation_nuit_kwh ?? '–'}</td>
                              <td className="px-3 py-1.5 text-right">{f.prix_kwh ?? '–'}</td>
                            </tr>
                          );
                        })}
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
                                {isTeacher && a.students && (
                                  <span className="text-xs text-gray-400">
                                    {a.students.prenom} {a.students.nom} · {a.students.classe}
                                  </span>
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

      {/* ===== PAR ÉLÈVE (enseignant uniquement) ===== */}
      {tab === 'eleves' && isTeacher && (
        <VueParEleve eleves={eleves} />
      )}
    </div>
  );
}