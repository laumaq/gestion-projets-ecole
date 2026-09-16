// app/tools/mon-horaire/utils/horaire.ts

import type { Cours } from '../types';

export const PX_PAR_HEURE = 60;      // 1h = 60px → 1min = 1px
export const HEURE_MIN_DEFAUT = 8;   // 8h00
export const HEURE_MAX_DEFAUT = 18;  // 18h00

/** "08h15" → 495 (minutes depuis minuit). Renvoie 0 si non parseable. */
export function heureEnMinutes(h: string | null | undefined): number {
  if (!h) return 0;
  const m = h.match(/^(\d{1,2})h(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Position en px depuis `heureMinRef` (en heures, ex: 8). */
export function topPx(heure: string, heureMinRef: number): number {
  return (heureEnMinutes(heure) - heureMinRef * 60) * (PX_PAR_HEURE / 60);
}

/** Hauteur en px pour un cours. */
export function heightPx(debut: string, fin: string): number {
  return (heureEnMinutes(fin) - heureEnMinutes(debut)) * (PX_PAR_HEURE / 60);
}

/** "08h15" → "8h15" (retire les zéros en tête d'heure, garde les minutes). */
export function formatHeureCourte(h: string): string {
  if (!h) return '';
  const m = h.match(/^(\d{1,2})h(\d{2})$/);
  if (!m) return h;
  return `${parseInt(m[1], 10)}h${m[2]}`;
}

/**
 * Calcule la plage horaire à afficher en fonction des cours.
 * Étend la plage par défaut si un cours tombe en dehors.
 */
export function calculerPlageHoraire(cours: Cours[]): { min: number; max: number } {
  let min = HEURE_MIN_DEFAUT;
  let max = HEURE_MAX_DEFAUT;

  for (const c of cours) {
    const d = heureEnMinutes(c.heure_debut);
    const f = heureEnMinutes(c.heure_fin);
    if (d > 0 && d < min * 60) min = Math.floor(d / 60);
    if (f > 0 && f > max * 60) max = Math.ceil(f / 60);
  }

  return { min, max };
}

/** Extrait le nom de groupe depuis `raw_pattern` ("[X]" ou "5PAT"). */
export function extraireGroupe(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(/\[([^\]]+)\]/);
  if (match) return match[1].trim();
  const matchClasse = raw.match(/^(\d+PA[A-Z])/);
  if (matchClasse) return matchClasse[1];
  return null;
}

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

/** Tri : jour → heure début → matière. */
export function trierCours(cours: Cours[]): Cours[] {
  return [...cours].sort((a, b) => {
    const jA = JOURS_ORDRE.indexOf((a.jour || '').toLowerCase());
    const jB = JOURS_ORDRE.indexOf((b.jour || '').toLowerCase());
    if (jA !== jB) return jA - jB;
    const hA = heureEnMinutes(a.heure_debut);
    const hB = heureEnMinutes(b.heure_debut);
    if (hA !== hB) return hA - hB;
    return (a.matiere || '').localeCompare(b.matiere || '');
  });
}

/** Filtre les cours pour un jour donné (comparaison sur le nom du jour). */
export function coursDuJour(cours: Cours[], nomJour: string): Cours[] {
  const cible = nomJour.toLowerCase();
  return cours.filter((c) => (c.jour || '').toLowerCase() === cible);
}