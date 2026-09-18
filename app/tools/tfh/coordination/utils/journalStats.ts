// app/tools/tfh/coordination/utils/journalStats.ts
import { Eleve } from '../types';

// ============================================================
// Types
// ============================================================
export type Niveau = 'vert' | 'jaune' | 'orange' | 'rouge' | 'indetermine';

export interface JournalEntry {
  type: string;
  titre: string;
  contenu: string;
  date: string;
}

export interface StatsJournal {
  // Compteurs bruts
  total: number;
  parType: Record<string, number>;
  derniereDate: Date | null;
  premiereDate: Date | null;
  joursDepuisDerniere: number | null;
  semainesDepuisPremiere: number | null;

  // Indicateurs
  fraicheur: Niveau;
  equilibre: Niveau;
  rattrapage: Niveau;

  // Score global
  nbVerts: number;
  nbEvaluables: number;

  // Détails pour tooltips
  ratioEquilibre: number | null; // min/max en %
  rythme: number | null;
  rythmeReference: number | null;
  ratioRattrapage: number | null;
}

// ============================================================
// Constantes
// ============================================================
const TYPE_OBJECTIF = 'Objectif';
const TYPE_DEROULEMENT = 'Déroulement';
const TYPE_REFLEXION = 'Réflexion';
const TYPES_ATTENDUS = [TYPE_OBJECTIF, TYPE_DEROULEMENT, TYPE_REFLEXION];

const SEUIL_VERT = 80;
const SEUIL_JAUNE = 65;
const SEUIL_ORANGE = 50;

// ============================================================
// Helpers
// ============================================================

/** Retourne le nombre de jours entre deux dates (arrondi) */
function joursEntre(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/** Retourne le nombre de semaines entre deux dates, minimum 1 */
function semainesEntre(a: Date, b: Date): number {
  return Math.max(1, joursEntre(a, b) / 7);
}

/** Niveau à partir d'un pourcentage de ratio (0-100+) */
function niveauDepuisRatio(ratio: number): Niveau {
  if (ratio >= SEUIL_VERT) return 'vert';
  if (ratio >= SEUIL_JAUNE) return 'jaune';
  if (ratio >= SEUIL_ORANGE) return 'orange';
  return 'rouge';
}

// ============================================================
// Indicateur 1 — Fraîcheur
// ============================================================
function calculerFraicheur(joursDepuisDerniere: number | null): Niveau {
  if (joursDepuisDerniere === null) return 'rouge';
  if (joursDepuisDerniere < 14) return 'vert';
  if (joursDepuisDerniere < 30) return 'jaune';
  if (joursDepuisDerniere < 60) return 'orange';
  return 'rouge';
}

// ============================================================
// Indicateur 2 — Équilibre
// ratio = min(nb par type) / max(nb par type)
// Sur les 3 types absolus (Objectif, Déroulement, Réflexion)
// ============================================================
function calculerEquilibre(parType: Record<string, number>): {
  niveau: Niveau;
  ratio: number | null;
} {
  const valeurs = TYPES_ATTENDUS.map(t => parType[t] || 0);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);

  // Aucune entrée → indéterminé
  if (max === 0) {
    return { niveau: 'indetermine', ratio: null };
  }

  const ratio = (min / max) * 100;
  return { niveau: niveauDepuisRatio(ratio), ratio };
}

// ============================================================
// Indicateur 3 — Rattrapage
// rythme_élève / rythme_référence (top 10% producteurs)
// ============================================================

/**
 * Calcule le rythme d'un élève : nb entrées / semaines depuis la 1ère entrée
 */
function calculerRythme(stats: { total: number; premiereDate: Date | null }): number | null {
  if (stats.total === 0 || !stats.premiereDate) return null;
  const now = new Date();
  const semaines = semainesEntre(now, stats.premiereDate);
  return stats.total / semaines;
}

/**
 * Calcule le rythme de référence = moyenne des rythmes du top 10%
 * d'élèves (par nombre total d'entrées).
 */
export function calculerRythmeReference(tousLesRythmes: Array<number | null>): number | null {
  const valides = tousLesRythmes.filter((r): r is number => r !== null && r > 0);
  if (valides.length === 0) return null;

  // Top 10% par rythme décroissant
  const sorted = [...valides].sort((a, b) => b - a);
  const tailleTop = Math.max(1, Math.ceil(sorted.length * 0.10));
  const top = sorted.slice(0, tailleTop);

  const moyenne = top.reduce((sum, r) => sum + r, 0) / top.length;
  return moyenne;
}

function calculerRattrapage(
  rythme: number | null,
  rythmeReference: number | null
): { niveau: Niveau; ratio: number | null } {
  if (rythme === null || rythmeReference === null || rythmeReference === 0) {
    return { niveau: 'indetermine', ratio: null };
  }
  const ratio = (rythme / rythmeReference) * 100;
  return { niveau: niveauDepuisRatio(ratio), ratio };
}

// ============================================================
// Fonction principale — analyse d'un élève
// ============================================================
export function analyserJournal(
  journal: JournalEntry[] | null | undefined,
  rythmeReference: number | null
): StatsJournal {
  const entries = journal || [];
  const now = new Date();

  // Compteurs par type
  const parType: Record<string, number> = {};
  TYPES_ATTENDUS.forEach(t => { parType[t] = 0; });
  entries.forEach(e => {
    parType[e.type] = (parType[e.type] || 0) + 1;
  });

  // Dates
  const dates = entries
    .map(e => new Date(e.date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  const derniereDate = dates[0] || null;
  const premiereDate = dates[dates.length - 1] || null;

  const joursDepuisDerniere = derniereDate ? joursEntre(now, derniereDate) : null;
  const semainesDepuisPremiere = premiereDate ? semainesEntre(now, premiereDate) : null;

  // Indicateurs
  const fraicheur = calculerFraicheur(joursDepuisDerniere);
  const equilibreData = calculerEquilibre(parType);
  const rythme = calculerRythme({ total: entries.length, premiereDate });
  const rattrapageData = calculerRattrapage(rythme, rythmeReference);

  // Score global (uniquement sur les indicateurs évaluables)
  const niveaux = [fraicheur, equilibreData.niveau, rattrapageData.niveau];
  const evaluables = niveaux.filter(n => n !== 'indetermine');
  const nbVerts = niveaux.filter(n => n === 'vert').length;
  const nbEvaluables = evaluables.length;

  return {
    total: entries.length,
    parType,
    derniereDate,
    premiereDate,
    joursDepuisDerniere,
    semainesDepuisPremiere,
    fraicheur,
    equilibre: equilibreData.niveau,
    rattrapage: rattrapageData.niveau,
    nbVerts,
    nbEvaluables,
    ratioEquilibre: equilibreData.ratio,
    rythme,
    rythmeReference,
    ratioRattrapage: rattrapageData.ratio,
  };
}

// ============================================================
// Helpers d'affichage
// ============================================================
export const NIVEAU_CONFIG: Record<Niveau, {
  label: string;
  emoji: string;
  bg: string;
  text: string;
  border: string;
}> = {
  vert: {
    label: 'OK',
    emoji: '🟢',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  jaune: {
    label: 'Attention',
    emoji: '🟡',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  orange: {
    label: 'Alerte',
    emoji: '🟠',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  rouge: {
    label: 'Critique',
    emoji: '🔴',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  indetermine: {
    label: 'Indéterminé',
    emoji: '—',
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
  },
};

/** Formate "il y a X jours" en français lisible */
export function formatJoursDepuis(jours: number | null): string {
  if (jours === null) return 'Jamais';
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return 'Hier';
  if (jours < 7) return `Il y a ${jours} jours`;
  if (jours < 30) {
    const semaines = Math.floor(jours / 7);
    return `Il y a ${semaines} sem.`;
  }
  const mois = Math.floor(jours / 30);
  return `Il y a ${mois} mois`;
}