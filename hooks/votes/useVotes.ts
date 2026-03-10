// hooks/votes/useVotes.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { getErrorMessage } from '@/lib/errors';

// Définir MENTIONS ici pour l'utiliser dans les calculs
const MENTIONS = [
  { value: 6, label: 'Très bien', color: 'bg-green-600' },
  { value: 5, label: 'Bien', color: 'bg-green-500' },
  { value: 4, label: 'Assez bien', color: 'bg-green-400' },
  { value: 3, label: 'Passable', color: 'bg-yellow-400' },
  { value: 2, label: 'Insuffisant', color: 'bg-orange-400' },
  { value: 1, label: 'À rejeter', color: 'bg-red-500' }
];

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
          communication_id: voteData.communicationId,
          intervention_libre_id: voteData.interventionLibreId,
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
      // On permet de revoter (pas de vérification d'existence)

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
      // Vérifier si l'utilisateur a déjà voté
      const { data: existingBallot } = await supabase
        .from('vote_ballots')
        .select('id')
        .eq('vote_id', voteId)
        .eq('voter_id', user.id)
        .eq('voter_type', user.type)
        .maybeSingle();

      if (existingBallot) {
        // MISE À JOUR : l'utilisateur a déjà voté, on met à jour
        const { error } = await supabase
          .from('vote_ballots')
          .update({
            choix: choix,
            vote_timestamp: new Date().toISOString()
          })
          .eq('id', existingBallot.id);

        if (error) throw error;
      } else {
        // CRÉATION : premier vote
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
      }
      
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

  // Remplacer calculatePlurinominal par ceci
  const calculatePlurinominal = (ballots: any[], options: any[]) => {
    console.log('🔍 CALCUL PLURINOMINAL - Ballots reçus:', ballots.length);
    
    const compteurs: Record<string, number> = {};
    options.forEach((opt: any) => compteurs[opt.id] = 0);
    
    ballots.forEach((ballot: any, index: number) => {
      console.log(`🔍 Ballot ${index}:`, ballot.choix);
      
      if (Array.isArray(ballot.choix)) {
        ballot.choix.forEach((choix: any) => {
          console.log('  → Choix:', choix);
          if (choix && choix.optionId && choix.selected === true) {
            compteurs[choix.optionId] = (compteurs[choix.optionId] || 0) + 1;
          }
        });
      }
    });
    
    console.log('🔍 COMPTEURS FINAUX:', compteurs);
    
    return {
      type: 'plurinominal',
      compteurs,
      totalVotants: ballots.length
    };
  };

  // Version unique et corrigée de calculateJugement
  const calculateJugement = (ballots: any[], options: any[]) => {
    // 1. Pour chaque option, récupérer toutes les mentions
    const mentionsParOption: Record<string, number[]> = {};
    options.forEach((opt: any) => mentionsParOption[opt.id] = []);
    
    ballots.forEach((ballot: any) => {
      if (Array.isArray(ballot.choix)) {
        ballot.choix.forEach((choix: any) => {
          if (mentionsParOption[choix.optionId] && typeof choix.valeur === 'number') {
            mentionsParOption[choix.optionId].push(choix.valeur);
          }
        });
      }
    });

    console.log('🔍 CALCUL JUGEMENT - Ballots:', ballots.length);
    ballots.forEach((b, i) => console.log(`Ballot ${i}:`, b.choix));

    // 2. Pour chaque option, trier les mentions et trouver la médiane
    const resultats = options.map((opt: any) => {
      const mentions = (mentionsParOption[opt.id] || []).sort((a, b) => a - b);
      const total = mentions.length;
      
      // Trouver la mention majoritaire (médiane)
      const medianIndex = Math.floor((total - 1) / 2);
      const mentionMajoritaire = total > 0 ? mentions[medianIndex] : 0;
      
      // Calculer les pourcentages pour l'affichage
      const repartition = [
        { mention: 'Très bien', count: mentions.filter(v => v === 6).length, percentage: 0 },
        { mention: 'Bien', count: mentions.filter(v => v === 5).length, percentage: 0 },
        { mention: 'Assez bien', count: mentions.filter(v => v === 4).length, percentage: 0 },
        { mention: 'Passable', count: mentions.filter(v => v === 3).length, percentage: 0 },
        { mention: 'Insuffisant', count: mentions.filter(v => v === 2).length, percentage: 0 },
        { mention: 'À rejeter', count: mentions.filter(v => v === 1).length, percentage: 0 }
      ];

      // Calculer les pourcentages
      repartition.forEach(r => {
        r.percentage = total > 0 ? (r.count / total) * 100 : 0;
      });

      return {
        optionId: opt.id,
        texte: opt.texte,
        mentionMajoritaire,
        repartition,
        totalVotes: total
      };
    });

  return {
    type: 'jugement',
    resultats,
    totalVotants: ballots.length
  };
};

  // Remplacer calculateRang par cette version
  const calculateRang = (ballots: any[], options: any[]) => {
    // Système de points : plus le rang est petit, plus de points
    // Exemple: pour 4 options, 1er choix = 4 points, 2e = 3, 3e = 2, 4e = 1
    const points: Record<string, number> = {};
    options.forEach((opt: any) => points[opt.id] = 0);
    
    // Compter aussi les premières positions
    const premiersChoix: Record<string, number> = {};
    options.forEach((opt: any) => premiersChoix[opt.id] = 0);
    
    ballots.forEach((ballot: any) => {
      ballot.choix.forEach((choix: any) => {
        // Attribuer des points selon le rang
        const pointsGagnes = options.length - choix.rang + 1;
        points[choix.optionId] += pointsGagnes;
        
        // Compter les premières positions
        if (choix.rang === 1) {
          premiersChoix[choix.optionId] = (premiersChoix[choix.optionId] || 0) + 1;
        }
      });
    });

    // Créer un tableau de résultats triés
    const resultats = options.map((opt: any) => ({
      optionId: opt.id,
      texte: opt.texte,
      points: points[opt.id],
      premiersChoix: premiersChoix[opt.id] || 0
    }));

    // Trier par points (et par premiers choix en cas d'égalité)
    resultats.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      return b.premiersChoix - a.premiersChoix;
    });

    return {
      type: 'rang',
      resultats,
      gagnant: resultats[0]?.optionId,
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