// /lib/conseilLutte/animateurs.ts

import { supabase } from '@/lib/supabase';

/** Charge les matricules animateurs pour une phase. */
export async function chargerAnimateursPhase(phaseId: string): Promise<Set<number>> {
  const { data } = await supabase
    .from('conseil_lutte_animateurs')
    .select('student_matricule')
    .eq('phase_id', phaseId);
  return new Set((data || []).map(a => a.student_matricule));
}

/** Nomme un élève animateur pour une phase. Idempotent. */
export async function nommerAnimateur(matricule: number, phaseId: string): Promise<void> {
  await supabase
    .from('conseil_lutte_animateurs')
    .upsert(
      { student_matricule: matricule, phase_id: phaseId },
      { onConflict: 'student_matricule,phase_id' }
    );
}

/** Retire la nomination. */
export async function retirerAnimateur(matricule: number, phaseId: string): Promise<void> {
  await supabase
    .from('conseil_lutte_animateurs')
    .delete()
    .eq('student_matricule', matricule)
    .eq('phase_id', phaseId);
}