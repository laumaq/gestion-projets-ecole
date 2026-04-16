// lib/tfh/permissions.ts
import { supabase } from '@/lib/supabase';

export type TfhDashboardType = 'coordination' | 'direction' | 'guide' | 'eleve' | null;

const TFH_GROUPE_ID = '0092b3db-1f7e-40e1-8f6b-70219d6a50f2';

export async function getTfhDashboardType(
  userType: 'employee' | 'student',
  userId: string,
  userJob: string
): Promise<TfhDashboardType> {
  console.log('getTfhDashboardType:', { userType, userId, userJob });

  if (userType === 'student') {
    const matricule = parseInt(userId);
    
    // Récupérer le niveau de l'élève
    const { data: student, error } = await supabase
      .from('students')
      .select('niveau')
      .eq('matricule', matricule)
      .maybeSingle();
    
    console.log('Student niveau:', student?.niveau, typeof student?.niveau);

    // Vérifier si l'élève est en 6ème
    const niveau = student?.niveau?.toString() || '';
    if (niveau.startsWith('6')) {
      // S'assurer que l'élève a une entrée dans tfh_eleves
      const { data: existing, error: checkError } = await supabase
        .from('tfh_eleves')
        .select('student_matricule')
        .eq('student_matricule', matricule)
        .maybeSingle();

      if (!existing) {
        // Créer une entrée pour l'élève
        const { error: insertError } = await supabase
          .from('tfh_eleves')
          .insert({
            student_matricule: matricule,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Erreur création entrée TFH:', insertError);
        }
      }
      
      return 'eleve';
    }
    return null;
  }

  // Employees
  if (userJob === 'direction') {
    return 'direction';
  }

  // Vérifier si l'employé a le groupe_id correspondant à TFH
  const { data: employee, error } = await supabase
    .from('employees')
    .select('groupe_id')
    .eq('id', userId)
    .maybeSingle();

  console.log('Employee groupe_id:', employee?.groupe_id);

  if (employee?.groupe_id === TFH_GROUPE_ID) {
    return 'coordination';
  }

  // Sinon, c'est un guide (professeur)
  if (userJob === 'prof') {
    return 'guide';
  }

  return null;
}