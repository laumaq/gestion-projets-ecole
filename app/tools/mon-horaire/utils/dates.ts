// app/tools/mon-horaire/utils/dates.ts

const JOURS_FR = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
];

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Retourne le lundi de la semaine contenant `d` (00:00). */
export function lundiDeLaSemaine(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay(); // 0=dim, 1=lun, ...
  const diff = day === 0 ? -6 : 1 - day; // ramène au lundi
  copy.setDate(copy.getDate() + diff);
  return copy;
}

/** Retourne les 5 jours ouvrés (lundi → vendredi) de la semaine contenant `d`. */
export function joursOuvresDeLaSemaine(d: Date): Date[] {
  const lundi = lundiDeLaSemaine(d);
  return Array.from({ length: 5 }, (_, i) => {
    const j = new Date(lundi);
    j.setDate(lundi.getDate() + i);
    return j;
  });
}

/** Ajoute `n` jours à une date (retourne une nouvelle Date). */
export function ajouterJours(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Jour ouvré suivant (saute samedi/dimanche). */
export function jourOuvreSuivant(d: Date): Date {
  let copy = ajouterJours(d, 1);
  while (copy.getDay() === 0 || copy.getDay() === 6) {
    copy = ajouterJours(copy, 1);
  }
  return copy;
}

/** Jour ouvré précédent (saute samedi/dimanche). */
export function jourOuvrePrecedent(d: Date): Date {
  let copy = ajouterJours(d, -1);
  while (copy.getDay() === 0 || copy.getDay() === 6) {
    copy = ajouterJours(copy, -1);
  }
  return copy;
}

/** Si on est samedi/dimanche, renvoie le lundi suivant. Sinon la date elle-même. */
export function dateOuvree(d: Date): Date {
  const day = d.getDay();
  if (day === 6) return ajouterJours(d, 2); // samedi → lundi
  if (day === 0) return ajouterJours(d, 1); // dimanche → lundi
  return d;
}

/** "lundi", "mardi", ... depuis une Date. */
export function nomJourFr(d: Date): string {
  return JOURS_FR[d.getDay()];
}

/** "Lundi 15 septembre 2026" */
export function formatJourLong(d: Date): string {
  const jour = JOURS_FR[d.getDay()];
  const mois = MOIS_FR[d.getMonth()];
  return `${jour.charAt(0).toUpperCase() + jour.slice(1)} ${d.getDate()} ${mois} ${d.getFullYear()}`;
}

/** "Lundi 15" (pour l'en-tête des colonnes de la vue semaine). */
export function formatJourCourt(d: Date): string {
  const jour = JOURS_FR[d.getDay()];
  return `${jour.charAt(0).toUpperCase() + jour.slice(1)} ${d.getDate()}`;
}

/** "15 – 19 septembre 2026" ou "29 sept. – 3 oct. 2026" si changement de mois. */
export function formatPlageSemaine(lundi: Date): string {
  const vendredi = ajouterJours(lundi, 4);
  if (lundi.getMonth() === vendredi.getMonth()) {
    return `${lundi.getDate()} – ${vendredi.getDate()} ${MOIS_FR[lundi.getMonth()]} ${lundi.getFullYear()}`;
  }
  return `${lundi.getDate()} ${MOIS_FR[lundi.getMonth()]} – ${vendredi.getDate()} ${MOIS_FR[vendredi.getMonth()]} ${vendredi.getFullYear()}`;
}

/** Vrai si les deux dates sont le même jour civil. */
export function memeJour(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}