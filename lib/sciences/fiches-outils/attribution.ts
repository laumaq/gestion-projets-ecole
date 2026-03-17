// ============================================================
// lib/fiches-outils/attribution.ts
// Fonctions d'attribution des fiches aux élèves
// ============================================================
import { supabase } from '@/lib/supabase';

/** Attribuer une fiche à un ou plusieurs élèves */
export async function attribuerFiche(ficheKey: string, studentIds: number[]) {
  if (studentIds.length === 0) return;
  const col = `${ficheKey}_attributed_at`;

  // Upsert : crée la ligne si elle n'existe pas, met à jour la colonne si NULL
  for (const id of studentIds) {
    await supabase.rpc('upsert_fiche_progression', {
      p_student_id: id,
      p_fiche: ficheKey,
      p_event: 'attributed',
    });
  }
}

/** Récupérer tous les élèves d'une ou plusieurs classes avec leur progression */
export async function getProgressionClasses(classes: string[]) {
  if (classes.length === 0) return [];
  const { data, error } = await supabase
    .from('v_fiches_outils_progression')
    .select('*')
    .in('classe', classes)
    .order('classe')
    .order('nom');
  if (error) throw error;
  return data ?? [];
}

/** Récupérer les élèves d'une liste de groupes pédagogiques */
export async function getStudentsByGroupes(groupes: string[]): Promise<number[]> {
  if (groupes.length === 0) return [];
  const { data } = await supabase
    .from('students_groups')
    .select('matricule')
    .in('groupe_code', groupes);
  return (data ?? []).map((r: any) => r.matricule as number);
}

/** Récupérer les élèves d'une liste de classes */
export async function getStudentsByClasses(classes: string[]): Promise<number[]> {
  if (classes.length === 0) return [];
  const { data } = await supabase
    .from('students')
    .select('matricule')
    .in('classe', classes);
  return (data ?? []).map((r: any) => r.matricule as number);
}

/** Statut d'une fiche pour un élève */
export type FicheStatut = 'not_attributed' | 'attributed' | 'opened' | 'succeeded';

export function computeStatut(row: Record<string, string | null>, ficheKey: string): FicheStatut {
  if (row[`${ficheKey}_succeeded_at`])  return 'succeeded';
  if (row[`${ficheKey}_opened_at`])     return 'opened';
  if (row[`${ficheKey}_attributed_at`]) return 'attributed';
  return 'not_attributed';
}

export const STATUT_LABELS: Record<FicheStatut, string> = {
  not_attributed: 'Non attribuée',
  attributed:     'Attribuée',
  opened:         'En cours',
  succeeded:      'Réussie',
};

export const STATUT_COLORS: Record<FicheStatut, { bg: string; text: string; border: string }> = {
  not_attributed: { bg: 'var(--color-background-secondary)', text: 'var(--color-text-secondary)', border: 'var(--color-border-tertiary)' },
  attributed:     { bg: '#FAEEDA', text: '#854F0B',  border: '#FAC775' },
  opened:         { bg: '#E6F1FB', text: '#185FA5',  border: '#B5D4F4' },
  succeeded:      { bg: '#EAF3DE', text: '#3B6D11',  border: '#C0DD97' },
};