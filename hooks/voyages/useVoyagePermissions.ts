// hooks/useVoyagePermissions.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useVoyagePermissions(voyageId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isResponsable, setIsResponsable] = useState(false);
  const [userType, setUserType] = useState<'employee' | 'student' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, [voyageId]);

  const checkPermissions = async () => {
    try {
      // Récupérer l'utilisateur connecté
      const type = localStorage.getItem('userType') as 'employee' | 'student';
      const id = localStorage.getItem('userId');

      if (!type || !id) {
        setError('Non authentifié');
        setIsLoading(false);
        return;
      }

      setUserType(type);
      setUserId(id);

      if (type === 'employee') {
        // Vérifier si l'employé est responsable du voyage
        const { data, error } = await supabase
          .from('voyage_professeurs')
          .select('role')
          .eq('voyage_id', voyageId)
          .eq('professeur_id', id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setHasAccess(true);
          setIsResponsable(data.role === 'responsable');
        } else {
          // L'employé n'est pas dans la liste des professeurs du voyage
          setHasAccess(false);
          setError('Vous n\'êtes pas autorisé à accéder à ce voyage');
        }
      } else {
        // Pour les élèves, vérifier s'ils sont participants
        const { data, error } = await supabase
          .from('voyage_participants')
          .select('id')
          .eq('voyage_id', voyageId)
          .eq('eleve_id', parseInt(id))
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setHasAccess(true);
          setIsResponsable(false); // Les élèves ne sont jamais responsables
        } else {
          setHasAccess(false);
          setError('Vous n\'êtes pas inscrit à ce voyage');
        }
      }
    } catch (err) {
      console.error('Erreur vérification permissions:', err);
      setError('Erreur lors de la vérification des permissions');
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, hasAccess, isResponsable, userType, userId, error };
}
