// hooks/votes/useVotes.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { getErrorMessage } from '@/lib/errors';

export interface Vote {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  titre: string;
  description: string;
  question: string;
  options: Array<{
    id: string;
    texte: string;
    ordre: number;
    couleur?: string;
  }>;
  type_scrutin: 'uninominal' | 'plurinominal' | 'jugement' | 'rang';
  parametres: {
    anonymous: boolean;
    max_choices: number;
    min_choices: number;
    allow_blank: boolean;
    allow_modify: boolean;
    show_results: 'always' | 'after_vote' | 'after_close';
  };
  statut: 'brouillon' | 'actif' | 'cloture';
  ouverture_auto: string | null;
  fermeture_auto: string | null;
  module_contexte: string;
  module_id: string;
  communication_id?: string | null;
  intervention_libre_id?: string | null;
  electorate_type: string;
  results: any;
}

export const useVotes = (context: { 
  module: string; 
  id: string; 
  communicationId?: string;  
  interventionLibreId?: string;
}) => {
  const { user, loading: userLoading } = useUser();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ne pas exécuter les requêtes tant que l'utilisateur n'est pas chargé
  useEffect(() => {
    if (!userLoading && !user) {
      setError('Utilisateur non authentifié');
      setLoading(false);
    }
  }, [user, userLoading]);

  // Charger les votes seulement si l'utilisateur est authentifié
  const fetchVotes = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('votes')
        .select('*')
        .eq('module_contexte', context.module)
        .eq('module_id', context.id);

      // Filtrer par communication_id si fourni
      if (context.communicationId) {
        query = query.eq('communication_id', context.communicationId);
      }
      
      // Filtrer par intervention_libre_id si fourni
      if (context.interventionLibreId) {
        query = query.eq('intervention_libre_id', context.interventionLibreId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setVotes(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [context.module, context.id, context.communicationId, context.interventionLibreId, user]);


  // Effet pour charger les votes quand l'utilisateur est prêt
  useEffect(() => {
    if (user && context.id) {
      fetchVotes();
    }
  }, [user, context.id, fetchVotes]);

  // Créer un nouveau vote
  const createVote = async (voteData: {
    titre: string;
    description: string;
    question: string;
    options: string[];
    type_scrutin: Vote['type_scrutin'];
    parametres?: Partial<Vote['parametres']>;
    communicationId?: string; 
    interventionLibreId?: string;
    electorate_type?: string; 
  }) => {
    if (!user) throw new Error('Utilisateur non authentifié');
    if (!context.id) throw new Error('ID de contexte manquant');

    try {
      const options = voteData.options.map((texte, index) => ({
        id: crypto.randomUUID(),
        texte,
        ordre: index
      }));

      const parametresParDefaut = {
        anonymous: true,
        max_choices: 1,
        min_choices: 1,
        allow_blank: false,
        allow_modify: false,
        show_results: 'after_vote'
      };

      const { data, error } = await supabase
        .from('votes')
        .insert([{
          created_by: user.id,
          titre: voteData.titre,
          description: voteData.description,
          question: voteData.question,
          options: options,
          type_scrutin: voteData.type_scrutin,
          parametres: { ...parametresParDefaut, ...voteData.parametres },
          electorate_type: voteData.electorate_type || 'all_employees',
          module_contexte: context.module,
          module_id: context.id,
          communication_id: voteData.communicationId, // NOUVEAU
          intervention_libre_id: voteData.interventionLibreId, // NOUVEAU
          statut: 'brouillon'
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchVotes();
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  
  // Mettre à jour un vote
  const updateVote = async (voteId: string, updates: Partial<Vote>) => {
    if (!user) throw new Error('Utilisateur non authentifié');

    try {
      const { error } = await supabase
        .from('votes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', voteId);

      if (error) throw error;
      await fetchVotes();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  // Ouvrir un vote
  const openVote = async (voteId: string) => {
    return updateVote(voteId, { statut: 'actif' });
  };

  // Clôturer un vote
  const closeVote = async (voteId: string) => {
    if (!user) throw new Error('Utilisateur non authentifié');

    try {
      const results = await calculateResults(voteId);
      
      const { error } = await supabase
        .from('votes')
        .update({
          statut: 'cloture',
          results: results,
          updated_at: new Date().toISOString()
        })
        .eq('id', voteId);

      if (error) throw error;
      await fetchVotes();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  // Supprimer un vote
  const deleteVote = async (voteId: string) => {
    if (!user) throw new Error('Utilisateur non authentifié');

    try {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('id', voteId)
        .eq('statut', 'brouillon');

      if (error) throw error;
      await fetchVotes();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  // Vérifier si l'utilisateur peut voter
  const canVote = async (voteId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: existing } = await supabase
        .from('vote_ballots')
        .select('id')
        .eq('vote_id', voteId)
        .eq('voter_id', user.id)
        .eq('voter_type', user.type)
        .maybeSingle();

      if (existing) return false;

      const { data: vote } = await supabase
        .from('votes')
        .select('statut, electorate_type')
        .eq('id', voteId)
        .single();

      if (!vote || vote.statut !== 'actif') return false;

      switch (vote.electorate_type) {
        case 'all_employees':
          return user.type === 'employee';
        
        case 'module_participants':
          return true;
        
        case 'specific_users':
          const { data: electorate } = await supabase
            .from('vote_electorate')
            .select('id')
            .eq('vote_id', voteId)
            .eq('voter_id', user.id)
            .eq('voter_type', user.type)
            .maybeSingle();
          return !!electorate;
        
        default:
          return false;
      }
    } catch (err) {
      console.error('Erreur canVote:', getErrorMessage(err));
      return false;
    }
  };

  // Soumettre un vote
  const submitVote = async (voteId: string, choix: any[]) => {
    if (!user) throw new Error('Utilisateur non authentifié');

    try {
      const peutVoter = await canVote(voteId);
      if (!peutVoter) {
        throw new Error('Vous ne pouvez pas voter pour ce scrutin');
      }

      const { error } = await supabase
        .from('vote_ballots')
        .insert([{
          vote_id: voteId,
          voter_id: user.id,
          voter_type: user.type,
          choix: choix,
          ip_address: window.clientInformation?.platform,
          user_agent: navigator.userAgent
        }]);

      if (error) throw error;
      
      await fetchVotes();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  // Calculer les résultats d'un vote
  const calculateResults = async (voteId: string) => {
    try {
      const { data: ballots, error } = await supabase
        .from('vote_ballots')
        .select('choix')
        .eq('vote_id', voteId);

      if (error) throw error;

      const vote = votes.find(v => v.id === voteId);
      if (!vote) throw new Error('Vote non trouvé');

      switch (vote.type_scrutin) {
        case 'uninominal':
          return calculateUninominal(ballots, vote.options);
        case 'plurinominal':
          return calculatePlurinominal(ballots, vote.options);
        case 'jugement':
          return calculateJugement(ballots, vote.options);
        case 'rang':
          return calculateRang(ballots, vote.options);
        default:
          return null;
      }
    } catch (err) {
      console.error('Erreur calculateResults:', getErrorMessage(err));
      return null;
    }
  };

  // Fonctions de calcul spécifiques
  const calculateUninominal = (ballots: any[], options: any[]) => {
    const compteurs: Record<string, number> = {};
    options.forEach(opt => compteurs[opt.id] = 0);
    
    ballots.forEach(ballot => {
      if (ballot.choix[0]?.selected) {
        compteurs[ballot.choix[0].option_id]++;
      }
    });

    const total = ballots.length;
    const gagnant = Object.entries(compteurs)
      .reduce((a, b) => (a[1] > b[1] ? a : b));

    return {
      type: 'uninominal',
      compteurs,
      gagnant: gagnant[0],
      totalVotants: total,
      participation: total
    };
  };

  const calculatePlurinominal = (ballots: any[], options: any[]) => {
    const compteurs: Record<string, number> = {};
    options.forEach(opt => compteurs[opt.id] = 0);
    
    ballots.forEach(ballot => {
      ballot.choix.forEach((choix: any) => {
        if (choix.selected) {
          compteurs[choix.option_id]++;
        }
      });
    });

    return {
      type: 'plurinominal',
      compteurs,
      totalVotants: ballots.length
    };
  };

  const calculateJugement = (ballots: any[], options: any[]) => {
    const resultats: Record<string, { notes: number[], moyenne: number }> = {};
    
    options.forEach(opt => {
      const notes = ballots
        .map(b => b.choix.find((c: any) => c.option_id === opt.id)?.note)
        .filter((n): n is number => n !== undefined);
      
      const moyenne = notes.length > 0 
        ? notes.reduce((a, b) => a + b, 0) / notes.length 
        : 0;

      resultats[opt.id] = { notes, moyenne };
    });

    return {
      type: 'jugement',
      resultats,
      totalVotants: ballots.length
    };
  };

  const calculateRang = (ballots: any[], options: any[]) => {
    const points: Record<string, number> = {};
    options.forEach(opt => points[opt.id] = 0);
    
    ballots.forEach(ballot => {
      ballot.choix.forEach((choix: any) => {
        points[choix.option_id] += (options.length - choix.rang + 1);
      });
    });

    return {
      type: 'rang',
      points,
      totalVotants: ballots.length
    };
  };

  // Vérifier les ouvertures/fermetures automatiques
  useEffect(() => {
    if (!user) return;

    const checkAutoStatus = async () => {
      try {
        const maintenant = new Date().toISOString();
        
        await supabase
          .from('votes')
          .update({ statut: 'actif' })
          .eq('statut', 'brouillon')
          .lte('ouverture_auto', maintenant);

        await supabase
          .from('votes')
          .update({ statut: 'cloture' })
          .eq('statut', 'actif')
          .lte('fermeture_auto', maintenant);

        await fetchVotes();
      } catch (err) {
        console.error('Erreur vérification auto:', getErrorMessage(err));
      }
    };

    const interval = setInterval(checkAutoStatus, 60000);
    return () => clearInterval(interval);
  }, [user, fetchVotes]);

  return {
    votes,
    loading: loading || userLoading,
    error,
    createVote,
    updateVote,
    openVote,
    closeVote,
    deleteVote,
    canVote,
    submitVote,
    refresh: fetchVotes
  };
};