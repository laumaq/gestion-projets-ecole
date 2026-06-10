// components/votes/VoteCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Vote } from '@/hooks/votes/useVotes';
import { useUser } from '@/hooks/useUser';
import { useVotes } from '@/hooks/votes/useVotes';
import { supabase } from '@/lib/supabase';
import { VoteEditor } from './VoteEditor';
import { ResultsViewer } from './ResultsViewer';
import {
  ClockIcon,
  CheckCircleIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface VoteCardProps {
  vote: Vote;
  onUpdate?: () => void;
}

const MENTIONS = [
  { value: 6, label: 'Très bien', color: 'bg-green-600' },
  { value: 5, label: 'Bien', color: 'bg-green-400' },
  { value: 4, label: 'Assez bien', color: 'bg-lime-400' },
  { value: 3, label: 'Passable', color: 'bg-yellow-400' },
  { value: 2, label: 'Insuffisant', color: 'bg-orange-400' },
  { value: 1, label: 'À rejeter', color: 'bg-red-500' }
];

export function VoteCard({ vote, onUpdate }: VoteCardProps) {
  const { user } = useUser();
  const { openVote, closeVote, deleteVote, submitVote } = useVotes({ 
    module: vote.module_contexte, 
    id: vote.module_id 
  });
  
  const [hasVoted, setHasVoted] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedJugements, setSelectedJugements] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [userPreviousVote, setUserPreviousVote] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [showEditor, setShowEditor] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfVoted();
    }
  }, [vote.id, user]);

  // Initialiser les valeurs par défaut
  useEffect(() => {
    if (isExpanded && vote.candidates_source === 'employees' && Object.keys(selectedJugements).length === 0) {
      const defaultValue = vote.type_scrutin === 'jugement' ? 3 : 0; // 0 = NEUTRE pour approbation
      const defaultJugements: Record<string, number> = {};
      vote.options.forEach(opt => {
        defaultJugements[opt.id] = defaultValue;
      });
      setSelectedJugements(defaultJugements);
    }
  }, [isExpanded, vote.candidates_source, vote.type_scrutin, vote.options, selectedJugements]);

  const checkIfVoted = async () => {
    if (!user) return;
    
    try {
      // 1. D'abord, vérifier si l'utilisateur a voté via la table vote_voters
      const { data: voter, error: voterError } = await supabase
        .from('vote_voters')
        .select('ballot_hash')
        .eq('vote_id', vote.id)
        .eq('voter_id', user.id)
        .maybeSingle();

      if (voter) {
        setHasVoted(true);
        
        // Récupérer le bulletin associé à ce hash
        const { data: ballot } = await supabase
          .from('vote_ballots')
          .select('choix')
          .eq('vote_hash', voter.ballot_hash)
          .maybeSingle();

        if (ballot) {
          if (vote.type_scrutin === 'jugement') {
            const jugements: Record<string, number> = {};
            ballot.choix.forEach((c: any) => {
              jugements[c.optionId] = c.valeur;
            });
            setSelectedJugements(jugements);
            setUserPreviousVote(jugements);
          } else if (vote.type_scrutin === 'rang') {
            const ranksData: Record<string, number> = {};
            ballot.choix.forEach((c: any) => {
              ranksData[c.optionId] = c.rang;
            });
            setRanks(ranksData);
            setUserPreviousVote(ranksData);
          } else {
            const previousChoices = ballot.choix.map((c: any) => c.optionId);
            setSelectedOptions(previousChoices);
            setUserPreviousVote(previousChoices);
          }
        }
        return;
      }

      // 2. Si pas dans vote_voters, vérifier dans vote_ballots pour les votes non anonymes
      const { data: ballot } = await supabase
        .from('vote_ballots')
        .select('choix')
        .eq('vote_id', vote.id)
        .eq('voter_id', user.id)
        .eq('voter_type', user.type)
        .maybeSingle();
      
      if (ballot) {
        setHasVoted(true);
        
        if (vote.type_scrutin === 'jugement') {
          const jugements: Record<string, number> = {};
          ballot.choix.forEach((c: any) => {
            jugements[c.optionId] = c.valeur;
          });
          setSelectedJugements(jugements);
          setUserPreviousVote(jugements);
        } else if (vote.type_scrutin === 'rang') {
          const ranksData: Record<string, number> = {};
          ballot.choix.forEach((c: any) => {
            ranksData[c.optionId] = c.rang;
          });
          setRanks(ranksData);
          setUserPreviousVote(ranksData);
        } else {
          const previousChoices = ballot.choix.map((c: any) => c.optionId);
          setSelectedOptions(previousChoices);
          setUserPreviousVote(previousChoices);
        }
      }
    } catch (err) {
      console.error('Erreur vérification vote:', err);
    }
  };

  const handleRankChange = (optionId: string, rang: number) => {
    const existingOption = Object.entries(ranks).find(([_, r]) => r === rang);
    
    if (existingOption && existingOption[0] !== optionId) {
      const newRanks = { ...ranks };
      newRanks[optionId] = rang;
      newRanks[existingOption[0]] = ranks[optionId] || 0;
      setRanks(newRanks);
    } else {
      setRanks(prev => ({
        ...prev,
        [optionId]: rang
      }));
    }
  };

  const getStatusBadge = () => {
    switch (vote.statut) {
      case 'brouillon':
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">📝 Brouillon</span>;
      case 'actif':
        return <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">✅ En cours</span>;
      case 'cloture':
        return <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs">🏁 Clôturé</span>;
    }
  };

  const getTypeLabel = () => {
    switch (vote.type_scrutin) {
      case 'uninominal': return '🗳️ Uninominal';
      case 'plurinominal': return '📋 Plurinominal';
      case 'jugement': return '⭐ Jugement majoritaire';
      case 'rang': return '📊 Classement';
      case 'approbation': return '👍 Approbation (OUI/NON)';
      default: return vote.type_scrutin;
    }
  };

  const canShowResults = () => {
    const result = vote.statut === 'cloture' 
      || vote.parametres.show_results === 'always' 
      || (vote.parametres.show_results === 'after_vote' && hasVoted);
    
    console.log('🔍 canShowResults details:', {
      statut_cloture: vote.statut === 'cloture',
      show_results_always: vote.parametres.show_results === 'always',
      show_results_after_vote_and_hasVoted: vote.parametres.show_results === 'after_vote' && hasVoted,
      final: result
    });
    
    return result;
  };

  const handleOpen = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await openVote(vote.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erreur ouverture vote:', error);
      alert('Erreur lors de l\'ouverture du vote');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await closeVote(vote.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erreur clôture vote:', error);
      alert('Erreur lors de la clôture du vote');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm('Supprimer ce vote ?')) return;
    
    setLoading(true);
    try {
      await deleteVote(vote.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erreur suppression vote:', error);
      alert('Erreur lors de la suppression du vote');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    console.log('🔍 handleVote appelé');
    console.log('🔍 type_scrutin:', vote.type_scrutin);
    console.log('🔍 selectedJugements:', selectedJugements);
    console.log('🔍 selectedOptions:', selectedOptions);
    
    if (vote.type_scrutin === 'jugement') {
      if (Object.keys(selectedJugements).length !== vote.options.length) {
        setError('Veuillez évaluer toutes les options');
        return;
      }
    } else if (vote.type_scrutin === 'rang') {
      if (!isRanksValid()) {
        setError('Veuillez assigner un rang unique à chaque option');
        return;
      }
    } else if (vote.type_scrutin === 'approbation') {
      // Pour l'approbation, on vérifie que toutes les options ont une valeur
      if (Object.keys(selectedJugements).length !== vote.options.length) {
        setError('Configuration en cours...');
        return;
      }
    } else if (selectedOptions.length === 0) {
      setError('Veuillez sélectionner une option');
      return;
    }

    if (hasVoted && !vote.anonymous_vote) {
      const confirmModify = confirm('Vous avez déjà voté. Voulez-vous modifier votre vote ?');
      if (!confirmModify) return;
    } else if (hasVoted && vote.anonymous_vote) {
      setError('Les votes anonymes ne peuvent pas être modifiés');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      let choix;
      
      switch (vote.type_scrutin) {
        case 'uninominal':
          choix = [{ optionId: selectedOptions[0], selected: true }];
          break;
        case 'plurinominal':
          choix = selectedOptions.map(optId => ({ optionId: optId, selected: true }));
          break;
        case 'jugement':
          choix = Object.entries(selectedJugements).map(([optionId, valeur]) => ({
            optionId,
            valeur
          }));
          break;
        case 'approbation':
          choix = Object.entries(selectedJugements).map(([optionId, valeur]) => ({
            optionId,
            valeur
          }));
          console.log('🔍 choix pour approbation:', choix);
          break;
        case 'rang':
          choix = Object.entries(ranks).map(([optionId, rang]) => ({
            optionId,
            rang
          }));
          break;
        default:
          choix = [{ optionId: selectedOptions[0], selected: true }];
      }

      console.log('🔍 appel de submitVote avec:', { voteId: vote.id, choix });
      const result = await submitVote(vote.id, choix);
      console.log('🔍 résultat submitVote:', result);
      
      setHasVoted(true);
      
      if (result.ballotHash) {
        alert(`✓ Vote enregistré !\n\n🔑 Votre identifiant de vote : ${result.ballotHash}\n\n📝 Notez ce code. Vous pourrez l'utiliser pour vérifier que votre vote a bien été compté.`);
      } else {
        alert(hasVoted ? 'Votre vote a été modifié' : 'Votre vote a été enregistré');
      }
      
      if (vote.type_scrutin === 'jugement' || vote.type_scrutin === 'approbation') {
        setUserPreviousVote(selectedJugements);
      } else if (vote.type_scrutin === 'rang') {
        setUserPreviousVote(ranks);
      } else {
        setUserPreviousVote(selectedOptions);
      }
      
      if (onUpdate) onUpdate();
      
    } catch (error: any) {
      console.error('❌ Erreur vote:', error);
      setError(error.message || 'Erreur lors du vote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    setShowEditor(true);
  };

  const handleOptionChange = (optId: string) => {
    if (vote.type_scrutin === 'uninominal') {
      setSelectedOptions([optId]);
    } else {
      setSelectedOptions(prev => 
        prev.includes(optId) 
          ? prev.filter(id => id !== optId)
          : [...prev, optId]
      );
    }
  };

  const handleJugementChange = (optionId: string, valeur: number) => {
    setSelectedJugements(prev => ({
      ...prev,
      [optionId]: valeur
    }));
  };

  const isJugementValid = () => {
    return Object.keys(selectedJugements).length === vote.options.length;
  };

  const verifyMyVote = async () => {
    try {
      const { data: voter } = await supabase
        .from('vote_voters')
        .select('ballot_hash, voted_at')
        .eq('vote_id', vote.id)
        .eq('voter_id', user?.id)
        .single();

      if (!voter) {
        alert('❌ Vous n\'avez pas voté pour ce scrutin');
        return;
      }

      const { count } = await supabase
        .from('vote_ballots')
        .select('id', { count: 'exact', head: true })
        .eq('vote_id', vote.id);

      const { data: ballot } = await supabase
        .from('vote_ballots')
        .select('vote_hash')
        .eq('vote_hash', voter.ballot_hash)
        .single();

      if (ballot) {
        alert(
          `🔍 Vérification de votre vote\n\n` +
          `✅ Vote trouvé\n` +
          `📅 Date : ${new Date(voter.voted_at).toLocaleString()}\n` +
          `📊 Position : parmi ${count || 0} votes\n` +
          `🔑 Votre identifiant : ${voter.ballot_hash.slice(0, 8)}...\n\n` +
          `💡 Vous pouvez vérifier sur la liste publique que votre identifiant est bien présent.`
        );
      } else {
        alert('❌ Vote non trouvé ! Contactez l\'administrateur.');
      }
    } catch (error) {
      console.error('Erreur vérification:', error);
      alert('Erreur lors de la vérification');
    }
  };

  if (!user) {
    return null;
  }

  const isRanksValid = () => {
    const assignedRanks = Object.values(ranks);
    if (assignedRanks.length !== vote.options.length) return false;
    const uniqueRanks = new Set(assignedRanks);
    return uniqueRanks.size === vote.options.length;
  };

  const isCreator = user.id === vote.created_by;
  const showVoteButton = vote.statut === 'actif';
  
  const canSubmitVote = vote.type_scrutin === 'jugement' 
    ? isJugementValid()
    : vote.type_scrutin === 'rang'
      ? isRanksValid()
      : vote.type_scrutin === 'approbation'
        ? true  // Toujours possible de voter, même avec des neutres
        : selectedOptions.length > 0;

  const hasVotedAndDifferent = hasVoted && (
    vote.type_scrutin === 'jugement'
      ? JSON.stringify(selectedJugements) !== JSON.stringify(userPreviousVote)
      : vote.type_scrutin === 'rang'
        ? JSON.stringify(ranks) !== JSON.stringify(userPreviousVote)
        : JSON.stringify(selectedOptions) !== JSON.stringify(userPreviousVote)
  );

  console.log('🔍 DEBUG canShowResults:', {
    statut: vote.statut,
    show_results: vote.parametres?.show_results,
    hasVoted: hasVoted,
    result: canShowResults()
  });

  console.log('🔍 DEBUG vote.parametres complet:', vote.parametres);

  return (
    <>
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* En-tête */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{vote.titre}</h3>
              {getStatusBadge()}
              <span className="text-xs text-gray-500">{getTypeLabel()}</span>
              {vote.anonymous_vote && (
                <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                  🔒 Anonyme
                </span>
              )}
              {!vote.anonymous_vote && (
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                  👤 Nominatif
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{vote.description}</p>
          </div>

          {/* Actions pour le créateur */}
          {isCreator && (
            <>
              {vote.statut === 'brouillon' && (
                <div className="flex gap-1">
                  <button 
                    onClick={handleEdit} 
                    className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50" 
                    title="Modifier"
                    disabled={loading}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleDelete} 
                    className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" 
                    title="Supprimer"
                    disabled={loading}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleOpen} 
                    className="p-2 text-gray-600 hover:text-green-600 disabled:opacity-50" 
                    title="Ouvrir le vote"
                    disabled={loading}
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                </div>
              )}

              {vote.statut === 'actif' && (
                <div className="flex gap-1">
                  <button 
                    onClick={handleClose} 
                    className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" 
                    title="Clôturer"
                    disabled={loading}
                  >
                    <StopIcon className="h-5 w-5" />
                  </button>
                </div>
              )}

              {vote.statut === 'cloture' && (
                <div className="flex gap-1">
                  <button 
                    onClick={handleOpen} 
                    className="p-2 text-gray-600 hover:text-green-600 disabled:opacity-50" 
                    title="Rouvrir le vote"
                    disabled={loading}
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleDelete} 
                    className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" 
                    title="Supprimer"
                    disabled={loading}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Version repliée : boutons adaptés au contexte */}
        {!isExpanded && (
          <div className="mt-2 flex gap-2">
            {/* Bouton principal selon le contexte */}
            <div className="flex-1">
              {vote.statut === 'cloture' ? (
                <button
                  onClick={() => setShowResultsModal(true)}
                  className="w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                >
                  📊 Voir les résultats
                </button>
              ) : hasVoted && vote.anonymous_vote ? (
                <div className="w-full py-2 bg-gray-100 text-gray-500 text-center rounded-lg text-sm">
                  ✅ Vous avez déjà voté (anonyme, non modifiable)
                </div>
              ) : hasVoted ? (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors"
                >
                  ✏️ Modifier ma participation
                </button>
              ) : (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  🗳️ Participer à la votation
                </button>
              )}
            </div>


            {/* Bouton "Voir les résultats" si accessible */}
            {canShowResults() && vote.statut !== 'cloture' && (
              <button
                onClick={() => setShowResultsModal(true)}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors"
              >
                📊 Résultats
              </button>
            )}
          </div>
        )}

        {/* Version dépliée : tout le contenu */}
        {isExpanded && (
          <>
            {/* Question */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Question :</p>
              <p className="text-gray-900">{vote.question}</p>
            </div>

            {/* Indicateur pour jugement majoritaire sans candidat */}
            {vote.type_scrutin === 'jugement' && vote.candidates_source === 'employees' && !hasVoted && (
              <p className="text-xs text-gray-400 mb-2">
                ℹ️ Par défaut, chaque option reçoit la mention "Passable". Modifiez selon votre avis.
              </p>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Options de vote */}
            {vote.statut === 'actif' && (
              <div className="mb-4">
                {vote.type_scrutin === 'approbation' ? (
                  // Interface pour l'approbation (OUI / NEUTRE / NON)
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Pour chaque option, indiquez votre position :
                    </p>
                    {vote.options.map(opt => {
                      const currentValue = selectedJugements[opt.id] || 0; // 1 = OUI, 0 = NEUTRE, -1 = NON
                      return (
                        <div key={opt.id} className="border rounded-lg p-3">
                          <p className="font-medium mb-2">{opt.texte}</p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleJugementChange(opt.id, 1)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentValue === 1
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 hover:bg-green-100 text-gray-700'
                              }`}
                            >
                              👍 OUI
                            </button>
                            <button
                              onClick={() => handleJugementChange(opt.id, 0)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentValue === 0
                                  ? 'bg-gray-400 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              ➖ NEUTRE
                            </button>
                            <button
                              onClick={() => handleJugementChange(opt.id, -1)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentValue === -1
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 hover:bg-red-100 text-gray-700'
                              }`}
                            >
                              👎 NON
                            </button>
                          </div>
                          {hasVoted && userPreviousVote[opt.id] !== undefined && (
                            <p className="text-xs text-blue-600 mt-2">
                              Votre choix: {userPreviousVote[opt.id] === 1 ? 'OUI' : userPreviousVote[opt.id] === -1 ? 'NON' : 'NEUTRE'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : vote.type_scrutin === 'rang' ? (
                  // Interface pour le classement (inchangé)
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-2">
                      Classez les options par ordre de préférence (1 = premier choix)
                    </p>
                    {vote.options.map(opt => (
                      <div key={opt.id} className="flex items-center gap-3 p-2 border rounded-lg">
                        <span className="text-sm text-gray-700 flex-1">{opt.texte}</span>
                        <select
                          value={ranks[opt.id] || ''}
                          onChange={(e) => handleRankChange(opt.id, parseInt(e.target.value))}
                          className="px-2 py-1 border rounded text-sm"
                          disabled={submitting}
                        >
                          <option value="">—</option>
                          {vote.options.map((_, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : vote.type_scrutin === 'jugement' ? (
                  // Interface pour le jugement majoritaire (inchangé)
                  <div className="space-y-4">
                    {vote.options.map(opt => (
                      <div key={opt.id} className="border rounded-lg p-3">
                        <p className="font-medium mb-2">{opt.texte}</p>
                        <div className="flex flex-wrap gap-2">
                          {MENTIONS.map(mention => (
                            <button
                              key={mention.value}
                              onClick={() => handleJugementChange(opt.id, mention.value)}
                              className={`px-3 py-1 rounded-full text-sm ${
                                selectedJugements[opt.id] === mention.value
                                  ? `${mention.color} text-white`
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              disabled={submitting}
                            >
                              {mention.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Interface pour uninominal/plurinominal (inchangé)
                  <div className="space-y-2">
                    {vote.options.map(opt => (
                      <label key={opt.id} className={`flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                        hasVoted && userPreviousVote.includes(opt.id) ? 'bg-blue-50 border-blue-200' : ''
                      }`}>
                        <input
                          type={vote.type_scrutin === 'uninominal' ? 'radio' : 'checkbox'}
                          name={vote.type_scrutin === 'uninominal' ? `vote-${vote.id}` : undefined}
                          value={opt.id}
                          checked={selectedOptions.includes(opt.id)}
                          onChange={() => handleOptionChange(opt.id)}
                          className="h-4 w-4 text-blue-600"
                          disabled={submitting}
                        />
                        <span className="text-sm text-gray-700 flex-1">{opt.texte}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Infos supplémentaires */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                Créé le {new Date(vote.created_at).toLocaleDateString()}
              </span>
              {vote.parametres.anonymous && (
                <span className="bg-gray-100 px-2 py-1 rounded-full">🕵️ Vote anonyme</span>
              )}
              {vote.candidates_source === 'employees' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">👥 Sans candidat</span>
              )}
              {loading && <span className="text-blue-600">Chargement...</span>}
              {hasVoted && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                  Vous avez voté
                </span>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2">
              {showVoteButton && !hasVoted && (
                <button
                  onClick={handleVote}
                  disabled={submitting || !canSubmitVote}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {submitting ? 'Vote en cours...' : 'Voter'}
                </button>
              )}

              {showVoteButton && hasVoted && !vote.anonymous_vote && (
                <button
                  onClick={handleVote}
                  disabled={submitting || !canSubmitVote}
                  className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {submitting ? 'Vote en cours...' : 'Modifier mon vote'}
                </button>
              )}

              {showVoteButton && hasVoted && vote.anonymous_vote && (
                <div className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-500 text-center cursor-not-allowed">
                  ✓ Vote soumis et non-modifiable
                </div>
              )}

              {canShowResults() && (
                <button
                  onClick={() => setShowResultsModal(true)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  disabled={loading}
                >
                  Voir les résultats
                </button>
              )}
              
              {hasVoted && vote.anonymous_vote && (
                <button
                  onClick={verifyMyVote}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  disabled={loading}
                >
                  🔍 Vérifier
                </button>
              )}
            </div>

            {/* Bouton pour replier */}
            <div className="mt-3 text-center">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ▲ Réduire
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal des résultats */}
      {showResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Résultats - {vote.titre}</h3>
            <ResultsViewer vote={vote} user={user} />
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowResultsModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Fermer
              </button>
            </div>
            {canShowResults() && (
              <div className="mt-4 text-center">
                <a 
                  href={`/votes/public-list/${vote.id}`}
                  target="_blank"
                  className="text-xs text-blue-600 hover:underline"
                >
                  📋 Voir la liste publique des votes
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {showEditor && (
        <VoteEditor
          vote={vote}
          onClose={() => setShowEditor(false)}
          onSuccess={() => {
            setShowEditor(false);
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </>
  );
}