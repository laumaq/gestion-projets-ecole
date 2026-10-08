import { Cote } from './types';

export const COTE_LABELS: Record<string, string> = {
  'NA': 'NA',
  'EC-': 'EC-',
  'EC': 'EC',
  'EC+': 'EC+',
  'A': 'A',
  'CM': 'CM',
  'X': 'X',
  'null': '-',
};

export const COTE_COLORS: Record<string, string> = {
  'NA': 'bg-red-100 text-red-800',
  'EC-': 'bg-orange-100 text-orange-800',
  'EC': 'bg-yellow-100 text-yellow-800',
  'EC+': 'bg-lime-100 text-lime-800',
  'A': 'bg-green-100 text-green-800',
  'CM': 'bg-blue-100 text-blue-800',
  'X': 'bg-gray-100 text-gray-500',
  'null': 'bg-gray-50 text-gray-400',
};

// Valeur utilisée dans les <select> pour représenter NULL
export const NULL_SENTINEL = '__NULL__';

export function coteToLabel(cote: Cote): string {
  return cote === null ? '-' : cote;
}

export function labelToCote(label: string): Cote {
  if (label === '-' || label === NULL_SENTINEL) return null;
  return label as Cote;
}

export function getAnneeScolaireCourante(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function getAnneesScolairesDisponibles(): string[] {
  // Retourne les 5 dernières années scolaires
  const current = getAnneeScolaireCourante();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: 5 }, (_, i) => {
    const y = startYear - i;
    return `${y}-${y + 1}`;
  });
}