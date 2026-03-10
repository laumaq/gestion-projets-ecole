// components/votes/VoteCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Vote } from '@/hooks/votes/useVotes';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import {
  ClockIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface VoteCardProps {
  vote: Vote;
  onUpdate?: () => void;
}

export function VoteCard({ vote, onUpdate }: VoteCardProps) {
  const { user } = useUser();
  const [hasVoted, setHasVoted] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // ✅ Les hooks sont TOUJOURS appelés, même si user est null
  useEffect(() => {
    // On vérifie à l'intérieur du hook si user existe
    if (user) {
      checkIfVoted();
    }
  }, [vote.id, user]); // ✅ Ajouter user aux dépendances

  const checkIfVoted = async () => {
    if (!user) return; // ✅ Vérification à l'intérieur
    
    const { data } = await supabase
      .from('vote_ballots')
      .select('id')
      .eq('vote_id', vote.id)
      .eq('voter_id', user.id)
      .eq('voter_type', user.type)
      .maybeSingle();
    
    setHasVoted(!!data);
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
      case 'jugement': return '⭐ Jugement';
      case 'rang': return '📊 Classement';
    }
  };

  const canShowResults = () => {
    if (vote.statut === 'cloture') return true;
    if (vote.parametres.show_results === 'always') return true;
    if (vote.parametres.show_results === 'after_vote' && hasVoted) return true;
    return false;
  };

  const handleDelete = async () => {
    if (!user) return; // ✅ Vérification
    if (!confirm('Supprimer ce vote ?')) return;
    // Logique de suppression à implémenter
    onUpdate?.();
  };

  const handleOpen = async () => {
    if (!user) return; // ✅ Vérification
    // Logique d'ouverture à implémenter
    onUpdate?.();
  };

  const handleClose = async () => {
    if (!user) return; // ✅ Vérification
    // Logique de clôture à implémenter
    onUpdate?.();
  };

  // ✅ On vérifie APRÈS tous les hooks
  if (!user) {
    return null;
  }

  const isCreator = user.id === vote.created_by;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{vote.titre}</h3>
            {getStatusBadge()}
            <span className="text-xs text-gray-500">{getTypeLabel()}</span>
          </div>
          <p className="text-sm text-gray-600">{vote.description}</p>
        </div>

        {/* Actions pour le créateur */}
        {isCreator && vote.statut === 'brouillon' && (
          <div className="flex gap-1">
            <button className="p-2 text-gray-600 hover:text-blue-600" title="Modifier">
              <PencilIcon className="h-5 w-5" />
            </button>
            <button onClick={handleDelete} className="p-2 text-gray-600 hover:text-red-600" title="Supprimer">
              <TrashIcon className="h-5 w-5" />
            </button>
            <button onClick={handleOpen} className="p-2 text-gray-600 hover:text-green-600" title="Ouvrir le vote">
              <PlayIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {isCreator && vote.statut === 'actif' && (
          <div className="flex gap-1">
            <button onClick={handleClose} className="p-2 text-gray-600 hover:text-red-600" title="Clôturer">
              <StopIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700">Question :</p>
        <p className="text-gray-900">{vote.question}</p>
      </div>

      {/* Options */}
      <div className="mb-3 space-y-2">
        {vote.options.map(opt => (
          <div key={opt.id} className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 bg-gray-200 rounded-full" />
            <span>{opt.texte}</span>
          </div>
        ))}
      </div>

      {/* Infos supplémentaires */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <ClockIcon className="h-4 w-4" />
          Créé le {new Date(vote.created_at).toLocaleDateString()}
        </span>
        {vote.parametres.anonymous && (
          <span className="bg-gray-100 px-2 py-1 rounded-full">🕵️ Vote anonyme</span>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-2">
        {vote.statut === 'actif' && !hasVoted && (
          <button
            onClick={() => setShowVoteModal(true)}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Voter
          </button>
        )}

        {vote.statut === 'actif' && hasVoted && (
          <div className="flex-1 text-center py-2 bg-green-50 text-green-700 rounded-lg">
            <CheckCircleIcon className="h-5 w-5 inline mr-1" />
            Vote enregistré
          </div>
        )}

        {canShowResults() && (
          <button
            onClick={() => setShowResults(true)}
            className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
          >
            Voir les résultats
          </button>
        )}
      </div>

      {/* Modals à ajouter ici */}
    </div>
  );
}