// app/tools/tfh/coordination/tabs/SuiviCarnetsTab.tsx
'use client';

import { useState, useMemo } from 'react';
import { Eleve } from '../types';
import { useTypesTFH } from '../hooks/useTypesTFH';
import { getIconComponent } from '../utils/constants';
import { analyserJournal, calculerRythmeReference, StatsJournal, Niveau } from '../utils/journalStats';
import IndicatorCard from '../components/IndicatorCard';
import BadgeFraicheur from '../components/BadgeFraicheur';
import BadgeEquilibre from '../components/BadgeEquilibre';
import BadgeRattrapage from '../components/BadgeRattrapage';
import BadgeScoreGlobal from '../components/BadgeScoreGlobal';
import EntreePreview from '../components/EntreePreview';
import EleveDetailModal from '../components/EleveDetailModal';
import { Thermometer, Scale, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown } from 'lucide-react';

interface SuiviCarnetsTabProps {
  eleves: Eleve[];
}

type IndicatorFilter = 'fraicheur' | 'equilibre' | 'rattrapage' | null;
type SortField = 'eleve' | 'classe' | 'total' | 'fraicheur' | 'equilibre' | 'rattrapage';
type SortDir = 'asc' | 'desc';

interface EleveAvecStats {
  eleve: Eleve;
  stats: StatsJournal;
}

// Priorité de tri pour les niveaux (rouge en premier quand on trie "préoccupation")
const NIVEAU_PRIORITE: Record<Niveau, number> = {
  rouge: 0,
  orange: 1,
  jaune: 2,
  vert: 3,
  indetermine: 4,
};

export default function SuiviCarnetsTab({ eleves }: SuiviCarnetsTabProps) {
  const { typesDisponibles } = useTypesTFH(true);

  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [indicatorFilter, setIndicatorFilter] = useState<IndicatorFilter>(null);
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);

  // Périmètre : élèves non-traditionnels avec un type assigné
  const elevesCarnet = useMemo(() => {
    return eleves.filter(e =>
      e.type && e.type !== '' && e.type !== 'traditionnel'
    );
  }, [eleves]);

  // Étape 1 : calcul du rythme de référence (top 10%) sur TOUTE la cohorte non-tradi
  const rythmeReference = useMemo(() => {
    const rythmes = elevesCarnet
      .map(e => {
        const entries = e.journal || [];
        if (entries.length === 0) return null;
        const dates = entries.map(en => new Date(en.date)).filter(d => !isNaN(d.getTime()));
        if (dates.length === 0) return null;
        dates.sort((a, b) => b.getTime() - a.getTime());
        const premiere = dates[dates.length - 1];
        const semaines = Math.max(1, (Date.now() - premiere.getTime()) / (1000 * 60 * 60 * 24 * 7));
        return entries.length / semaines;
      });
    return calculerRythmeReference(rythmes);
  }, [elevesCarnet]);

  // Étape 2 : calcul des stats pour chaque élève (avec la référence)
  const elevesAvecStats: EleveAvecStats[] = useMemo(() => {
    return elevesCarnet.map(e => ({
      eleve: e,
      stats: analyserJournal(e.journal, rythmeReference),
    }));
  }, [elevesCarnet, rythmeReference]);

  // Étape 3 : filtrage (classe, type, recherche)
  const elevesFiltresBase = useMemo(() => {
    let result = elevesAvecStats;

    if (filterClass !== 'all') {
      result = result.filter(x => x.eleve.classe === filterClass);
    }

    if (filterType !== 'all') {
      result = result.filter(x => x.eleve.type === filterType);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(x =>
        x.eleve.nom?.toLowerCase().includes(q) ||
        x.eleve.prenom?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [elevesAvecStats, filterClass, filterType, searchQuery]);

  // Étape 4 : compteurs par indicateur (sur les filtres de base, pas sur le filtre indicateur)
  const countsParIndicateur = useMemo(() => {
    const init = (): Record<Niveau, number> => ({
      rouge: 0, orange: 0, jaune: 0, vert: 0, indetermine: 0,
    });
    const fraicheur = init();
    const equilibre = init();
    const rattrapage = init();

    elevesFiltresBase.forEach(({ stats }) => {
      fraicheur[stats.fraicheur]++;
      equilibre[stats.equilibre]++;
      rattrapage[stats.rattrapage]++;
    });

    return { fraicheur, equilibre, rattrapage };
  }, [elevesFiltresBase]);

  // Étape 5 : application du filtre indicateur (rouge + orange seulement)
  const elevesFiltres = useMemo(() => {
    let result = elevesFiltresBase;

    if (indicatorFilter === 'fraicheur') {
      result = result.filter(x => x.stats.fraicheur === 'rouge' || x.stats.fraicheur === 'orange');
    } else if (indicatorFilter === 'equilibre') {
      result = result.filter(x => x.stats.equilibre === 'rouge' || x.stats.equilibre === 'orange');
    } else if (indicatorFilter === 'rattrapage') {
      result = result.filter(x => x.stats.rattrapage === 'rouge' || x.stats.rattrapage === 'orange');
    }

    return result;
  }, [elevesFiltresBase, indicatorFilter]);

  // Étape 6 : tri
  const elevesTries = useMemo(() => {
    const sorted = [...elevesFiltres];
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'eleve':
          return dir * `${a.eleve.nom} ${a.eleve.prenom}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom}`);
        case 'classe':
          return dir * (a.eleve.classe || '').localeCompare(b.eleve.classe || '');
        case 'total':
          // Cas spécial : les élèves sans entrée remontent toujours en premier quand tri desc
          if (a.stats.total === 0 && b.stats.total !== 0) return sortDir === 'desc' ? -1 : 1;
          if (b.stats.total === 0 && a.stats.total !== 0) return sortDir === 'desc' ? 1 : -1;
          return dir * (a.stats.total - b.stats.total);
        case 'fraicheur':
          // Plus préoccupant = plus petit index → en haut quand desc
          return dir * (NIVEAU_PRIORITE[a.stats.fraicheur] - NIVEAU_PRIORITE[b.stats.fraicheur]);
        case 'equilibre':
          return dir * (NIVEAU_PRIORITE[a.stats.equilibre] - NIVEAU_PRIORITE[b.stats.equilibre]);
        case 'rattrapage':
          return dir * (NIVEAU_PRIORITE[a.stats.rattrapage] - NIVEAU_PRIORITE[b.stats.rattrapage]);
        default:
          return 0;
      }
    });
    return sorted;
  }, [elevesFiltres, sortField, sortDir]);

  const classesUniques = useMemo(() => {
    return Array.from(new Set(elevesCarnet.map(e => e.classe).filter(Boolean))).sort();
  }, [elevesCarnet]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Tri desc par défaut pour les indicateurs (préoccupants en haut)
      setSortDir(field === 'eleve' || field === 'classe' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const handleIndicatorCardClick = (indicator: IndicatorFilter) => {
    setIndicatorFilter(indicatorFilter === indicator ? null : indicator);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 mt-1">
          {elevesCarnet.length} élève{elevesCarnet.length > 1 ? 's' : ''} en format non-traditionnel
          {rythmeReference !== null && (
            <span className="ml-2 text-xs text-gray-400">
              · Rythme de référence (top 10%) : {rythmeReference.toFixed(2)} entrées/sem.
            </span>
          )}
        </p>
      </div>

      {/* 3 cartes indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <IndicatorCard
          title="Fraîcheur"
          icon={<Thermometer className="w-4 h-4" />}
          counts={countsParIndicateur.fraicheur}
          active={indicatorFilter === 'fraicheur'}
          onClick={() => handleIndicatorCardClick('fraicheur')}
          description="Temps écoulé depuis la dernière entrée"
        />
        <IndicatorCard
          title="Équilibre"
          icon={<Scale className="w-4 h-4" />}
          counts={countsParIndicateur.equilibre}
          active={indicatorFilter === 'equilibre'}
          onClick={() => handleIndicatorCardClick('equilibre')}
          description="Répartition entre Objectif / Déroulement / Réflexion"
        />
        <IndicatorCard
          title="Rattrapage"
          icon={<TrendingUp className="w-4 h-4" />}
          counts={countsParIndicateur.rattrapage}
          active={indicatorFilter === 'rattrapage'}
          onClick={() => handleIndicatorCardClick('rattrapage')}
          description="Rythme de production comparé à la référence top 10%"
        />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un élève..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="relative">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">Toutes les classes</option>
              {classesUniques.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">Tous les types</option>
              {typesDisponibles
                .filter(t => t.key !== 'traditionnel')
                .map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="ml-auto px-3 py-1.5 bg-violet-100 text-violet-800 rounded-lg font-medium text-sm">
            {elevesTries.length} élève{elevesTries.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('eleve')}>
                  Élève {getSortIcon('eleve')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('classe')}>
                  Classe {getSortIcon('classe')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total')}>
                  Entrées {getSortIcon('total')}
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('fraicheur')}>
                  Fraîcheur {getSortIcon('fraicheur')}
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('equilibre')}>
                  Équilibre {getSortIcon('equilibre')}
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('rattrapage')}>
                  Rattrapage {getSortIcon('rattrapage')}
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  3 dernières
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elevesTries.map(({ eleve, stats }) => {
                const typeInfo = typesDisponibles.find(t => t.key === eleve.type);
                const TypeIcon = typeInfo ? getIconComponent(typeInfo.icon) : null;

                return (
                  <tr
                    key={eleve.student_matricule}
                    className="hover:bg-violet-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedEleve(eleve)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {eleve.nom.toUpperCase()} {eleve.prenom}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                      {eleve.classe}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {typeInfo ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeInfo.color}`}>
                          {TypeIcon && <TypeIcon className="w-3 h-3" />}
                          {typeInfo.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <span className={`text-sm font-bold ${
                        stats.total === 0 ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {stats.total}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <BadgeFraicheur
                        niveau={stats.fraicheur}
                        joursDepuisDerniere={stats.joursDepuisDerniere}
                        compact
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <BadgeEquilibre
                        niveau={stats.equilibre}
                        ratio={stats.ratioEquilibre}
                        parType={stats.parType}
                        compact
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <BadgeRattrapage
                        niveau={stats.rattrapage}
                        ratio={stats.ratioRattrapage}
                        rythme={stats.rythme}
                        rythmeReference={stats.rythmeReference}
                        compact
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <BadgeScoreGlobal
                        nbVerts={stats.nbVerts}
                        nbEvaluables={stats.nbEvaluables}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <EntreePreview journal={eleve.journal} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {elevesTries.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">Aucun élève à afficher</div>
            <p className="text-gray-500 text-sm">
              {indicatorFilter
                ? 'Aucun élève ne correspond au filtre 🔴+🟠 actif.'
                : searchQuery || filterClass !== 'all' || filterType !== 'all'
                ? 'Aucun élève ne correspond à ces filtres.'
                : 'Les élèves en format non-traditionnel apparaîtront ici.'}
            </p>
            {indicatorFilter && (
              <button
                onClick={() => setIndicatorFilter(null)}
                className="mt-3 px-3 py-1.5 text-sm bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200"
              >
                Retirer le filtre
              </button>
            )}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Comment lire ce tableau</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
          <li><strong>Fraîcheur</strong> : délai depuis la dernière entrée (🟢 &lt; 14j · 🟡 14-30j · 🟠 30-60j · 🔴 &gt; 60j ou jamais)</li>
          <li><strong>Équilibre</strong> : ratio entre le type le moins utilisé et le plus utilisé (🟢 ≥ 80% · 🟡 65-80% · 🟠 50-65% · 🔴 &lt; 50%). Survolez pour le détail par type.</li>
          <li><strong>Rattrapage</strong> : rythme de production comparé à la moyenne du top 10% des élèves (🟢 ≥ 80% · 🟡 65-80% · 🟠 50-65% · 🔴 &lt; 50%). Survolez pour les chiffres.</li>
          <li><strong>Score</strong> : nombre d'indicateurs verts sur le total évaluable (— si aucun indicateur calculable).</li>
          <li><strong>Cartes en haut</strong> : cliquez pour filtrer uniquement les élèves 🔴 + 🟠 de l'indicateur.</li>
        </ul>
      </div>

      {/* Modal */}
      <EleveDetailModal
        eleve={selectedEleve}
        types={typesDisponibles}
        onClose={() => setSelectedEleve(null)}
      />
    </div>
  );
}