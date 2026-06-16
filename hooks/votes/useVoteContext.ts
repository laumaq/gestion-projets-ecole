// hooks/votes/useVoteContext.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { getErrorMessage } from '@/lib/errors';

// Définir le type pour idField
export type VoteIdField = 'module_id' | 'conseil_classe_classe_nom' | 'conseil_classe_id' | 'custom';

export interface VoteContext {
  module: string;
  id: string;
  idField?: VoteIdField;
  customIdField?: string;
  filter?: Record<string, any>;
  communicationId?: string;     // ← AJOUTER
  interventionLibreId?: string;
}

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
  type_scrutin: 'uninominal' | 'plurinominal' | 'jugement' | 'rang' | 'approbation';
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
  anonymous_vote: boolean;
  candidates_source?: 'custom' | 'employees';
  conseil_classe_classe_nom?: string;
  conseil_classe_annee?: string;
}

export function useVoteContext(context: VoteContext) {
  const { user, loading: userLoading } = useUser();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVotes = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const idField = context.idField || 'module_id';
      
      let query = supabase
        .from('votes')
        .select('*')
        .eq('module_contexte', context.module)
        .eq(idField, context.id);

      if (context.communicationId) {
        query = query.eq('communication_id', context.communicationId);
      }
      
      if (context.interventionLibreId) {
        query = query.eq('intervention_libre_id', context.interventionLibreId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // 🔥 FORMATER LES OPTIONS POUR CHAQUE VOTE
      const formattedData = (data || []).map((vote: any) => {
        let options = vote.options;
        
        // Si options est un tableau de strings, le convertir en objets avec id et texte
        if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'string') {
          options = options.map((texte: string, index: number) => ({
            id: `opt-${vote.id}-${index}`,
            texte: texte,
            ordre: index
          }));
        }
        // Si options est un tableau d'objets mais sans id
        else if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && !options[0].id) {
          options = options.map((opt: any, index: number) => ({
            id: `opt-${vote.id}-${index}`,
            texte: opt.texte || opt.label || `Option ${index + 1}`,
            ordre: opt.ordre || index
          }));
        }
        // Si options n'est pas un tableau
        else if (!Array.isArray(options)) {
          options = [];
        }
        
        return {
          ...vote,
          options: options
        };
      });
      
      setVotes(formattedData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [context.module, context.id, context.idField, context.communicationId, context.interventionLibreId, user]);

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
    anonymous_vote?: boolean;
    candidates_source?: 'custom' | 'employees';
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

      const idField = context.idField || 'module_id';
      const insertData: any = {
        created_by: user.id,
        titre: voteData.titre,
        description: voteData.description,
        question: voteData.question,
        options: options,
        type_scrutin: voteData.type_scrutin,
        parametres: { ...parametresParDefaut, ...voteData.parametres },
        electorate_type: voteData.electorate_type || 'all_employees',
        module_contexte: context.module,
        statut: 'brouillon',
        anonymous_vote: voteData.anonymous_vote || false,
        candidates_source: voteData.candidates_source || 'custom'
      };

      if (idField === 'conseil_classe_classe_nom') {
        insertData.conseil_classe_classe_nom = context.id;
      } else {
        insertData.module_id = context.id;
      }

      if (voteData.communicationId) {
        insertData.communication_id = voteData.communicationId;
      }
      if (voteData.interventionLibreId) {
        insertData.intervention_libre_id = voteData.interventionLibreId;
      }

      const { error: insertError } = await supabase
        .from('votes')
        .insert([insertData]);

      if (insertError) throw insertError;
      
      await fetchVotes();
      return { success: true };
      
    } catch (err) {
      console.error('Erreur createVote:', err);
      setError(getErrorMessage(err));
      throw err;
    }
  };

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

  const openVote = async (voteId: string) => {
    return updateVote(voteId, { statut: 'actif' });
  };

  const closeVote = async (voteId: string) => {
    if (!user) throw new Error('Utilisateur non authentifié');

    try {
      const { error } = await supabase
        .from('votes')
        .update({
          statut: 'cloture',
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

  const submitVote = async (voteId: string, choix: any[]) => {
    if (!user) throw new Error('Utilisateur non authentifié');

    try {
      const { data: vote } = await supabase
        .from('votes')
        .select('anonymous_vote')
        .eq('id', voteId)
        .single();

      const { data: existingVoter } = await supabase
        .from('vote_voters')
        .select('id')
        .eq('vote_id', voteId)
        .eq('voter_id', user.id)
        .maybeSingle();

      if (existingVoter) {
        throw new Error('Vous avez déjà voté');
      }

      const ballotHash = crypto.randomUUID();

      if (vote?.anonymous_vote) {
        const { error: ballotError } = await supabase
          .from('vote_ballots')
          .insert({
            vote_id: voteId,
            vote_hash: ballotHash,
            choix: choix
          });

        if (ballotError) throw ballotError;

        const { error: voterError } = await supabase
          .from('vote_voters')
          .insert({
            vote_id: voteId,
            voter_id: user.id,
            ballot_hash: ballotHash
          });

        if (voterError) throw voterError;
        return { ballotHash };
      } else {
        const { error } = await supabase
          .from('vote_ballots')
          .insert({
            vote_id: voteId,
            voter_id: user.id,
            voter_type: user.type,
            choix: choix
          });

        if (error) throw error;
        return { ballotHash: null };
      }
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const canVote = async (voteId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: vote } = await supabase
        .from('votes')
        .select('statut, electorate_type')
        .eq('id', voteId)
        .single();

      if (!vote || vote.statut !== 'actif') return false;
      return true;
    } catch (err) {
      console.error('Erreur canVote:', getErrorMessage(err));
      return false;
    }
  };
  
    const refresh = useCallback(async () => {
    await fetchVotes();
  }, [fetchVotes]);

  useEffect(() => {
    if (!userLoading) {
      fetchVotes();
    }
  }, [userLoading, fetchVotes]);

  // Souscription temps réel
  useEffect(() => {
    if (!user) return;

    const idField = context.idField || 'module_id';
    const filterField = idField === 'conseil_classe_classe_nom' 
      ? 'conseil_classe_classe_nom' 
      : idField === 'conseil_classe_id'
        ? 'conseil_classe_id'
        : 'module_id';

    const subscription = supabase
      .channel('votes_context_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `module_contexte=eq.${context.module} AND ${filterField}=eq.${context.id}`
        },
        (payload) => {
          console.log('🔄 Changement détecté dans les votes:', payload.eventType);
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, context.module, context.id, context.idField, fetchVotes]);

  return {
    votes,
    loading: loading || userLoading,
    error,
    refresh,
    createVote,
    updateVote,
    openVote,
    closeVote,
    deleteVote,
    canVote,
    submitVote,
    hasVotes: votes.length > 0,
    getVoteById: (id: string) => votes.find(v => v.id === id),
    getVotesByStatus: (statut: Vote['statut']) => votes.filter(v => v.statut === statut),
    getActiveVotes: () => votes.filter(v => v.statut === 'actif'),
    getClosedVotes: () => votes.filter(v => v.statut === 'cloture'),
    getDraftVotes: () => votes.filter(v => v.statut === 'brouillon'),
  };
}