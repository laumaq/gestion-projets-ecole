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
  const [statut, setStatut] = useState<string>('preparation');
  const [peutAgir, setPeutAgir] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, [voyageId]);

  const checkPermissions = async () => {
    try {
      const type = localStorage.getItem('userType') as 'employee' | 'student';
      const id = localStorage.getItem('userId');

      if (!type || !id) {
        setError('Non authentifié');
        setIsLoading(false);
        return;
      }

      setUserType(type);
      setUserId(id);

      // 1. Charger le statut du voyage
      const { data: voyageData, error: voyageError } = await supabase
        .from('voyages')
        .select('statut')
        .eq('id', voyageId)
        .single();

      if (voyageError) throw voyageError;
      const voyageStatut = voyageData?.statut || 'preparation';
      setStatut(voyageStatut);

      // 2. Vérifier si l'utilisateur fait partie du voyage
      let estParticipant = false;
      let estResponsable = false;

      if (type === 'employee') {
        const { data, error } = await supabase
          .from('voyage_professeurs')
          .select('role')
          .eq('voyage_id', voyageId)
          .eq('professeur_id', id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          estParticipant = true;
          estResponsable = data.role === 'responsable';
        }
      } else {
        const { data, error } = await supabase
          .from('voyage_participants')
          .select('id')
          .eq('voyage_id', voyageId)
          .eq('eleve_id', parseInt(id))
          .maybeSingle();

        if (error) throw error;

        if (data) estParticipant = true;
      }

      setIsResponsable(estResponsable);

      // 3. Appliquer les règles selon le statut
      let aAcces = false;

      switch (voyageStatut) {
        case 'preparation':
          aAcces = estResponsable;
          break;
        case 'preparation_publique':
        case 'termine':
        case 'archive':
        case 'en_cours':
          aAcces = estParticipant;
          break;
        default:
          aAcces = estParticipant;
      }

      setHasAccess(aAcces);

      // Peut agir si responsable OU si statut 'en_cours'
      const peutModifier = estResponsable || voyageStatut === 'en_cours';
      setPeutAgir(peutModifier);

      if (!aAcces) {
        setError('Vous n\'avez pas accès à ce voyage');
      }
    } catch (err) {
      console.error('Erreur vérification permissions:', err);
      setError('Erreur lors de la vérification des permissions');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    hasAccess,
    isResponsable,
    userType,
    userId,
    error,
    statut,
    peutAgir
  };
}