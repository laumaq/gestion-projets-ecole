// lib/tfh/permissions.ts
import { supabase } from '@/lib/supabase';

export type TfhDashboardType = 'coordination' | 'direction' | 'guide' | 'eleve' | null;

const TFH_GROUPE_COORDINATION_ID = '0092b3db-1f7e-40e1-8f6b-70219d6a50f2';

/**
 * Détermine quel dashboard TFH un utilisateur doit voir
 */
export async function getTfhDashboardType(
  userType: 'employee' | 'student',  // Type strict
  userId: string,
  userJob: string
): Promise<TfhDashboardType> {
  if (userType === 'student') {
    // Vérifier si l'élève est en 6ème
    const { data: student } = await supabase
      .from('students')
      .select('niveau')
      .eq('matricule', parseInt(userId))
      .single();
    
    if (student?.niveau?.startsWith('6')) {
      return 'eleve';
    }
    return null;
  }

  // Employees
  if (userJob === 'direction') {
    return 'direction';
  }

  // Vérifier si l'employé fait partie du groupe de travail coordination
  const { data: membre } = await supabase
    .from('tfh_groupes_travail_membres')
    .select('groupe_id')
    .eq('employee_id', userId)
    .eq('groupe_id', TFH_GROUPE_COORDINATION_ID)
    .maybeSingle();

  if (membre) {
    return 'coordination';
  }

  // Sinon, c'est un guide (professeur)
  if (userJob === 'prof') {
    return 'guide';
  }

  return null;
}