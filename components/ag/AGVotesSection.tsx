// components/ag/AGVotesSection.tsx
'use client';

import { useState } from 'react';
import { useVotes } from '@/hooks/votes/useVotes';
import { VoteCard } from '@/components/votes/VoteCard';
import { useAGPermissions } from '@/hooks/useAGPermissions';
import { VoteCreator } from '@/components/votes/VoteCreator';

interface AGVotesSectionProps {
  agId: string;
}

export function AGVotesSection({ agId }: AGVotesSectionProps) {
  const { votes, loading, refresh } = useVotes({ module: 'ag', id: agId });
  const { isDirection, isBureau } = useAGPermissions();
  const [showCreator, setShowCreator] = useState(false);

  const canCreateVote = isDirection || isBureau;

  // Compter les votes actifs
  const votesActifs = votes.filter(v => v.statut === 'actif').length;

  if (loading) {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Votes</h2>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Chargement des votes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Votes</h2>
          {votesActifs > 0 && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {votesActifs} actif{votesActifs > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {canCreateVote && (
          <button
            onClick={() => setShowCreator(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            + Nouveau vote
          </button>
        )}
      </div>

      {votes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun vote pour le moment</p>
          {canCreateVote && (
            <button
              onClick={() => setShowCreator(true)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Créer le premier vote
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* D'abord les votes actifs */}
          {votes.filter(v => v.statut === 'actif').map(vote => (
            <VoteCard 
              key={vote.id} 
              vote={vote} 
              onUpdate={refresh}
            />
          ))}

          {/* Puis les votes clôturés */}
          {votes.filter(v => v.statut === 'cloture').length > 0 && (
            <>
              <h3 className="text-sm font-medium text-gray-500 pt-4">Votes clôturés</h3>
              {votes
                .filter(v => v.statut === 'cloture')
                .map(vote => (
                  <VoteCard 
                    key={vote.id} 
                    vote={vote} 
                    onUpdate={refresh}
                  />
                ))}
            </>
          )}

          {/* Brouillons */}
          {votes.filter(v => v.statut === 'brouillon').length > 0 && (
            <>
              <h3 className="text-sm font-medium text-gray-500 pt-4">Brouillons</h3>
              {votes
                .filter(v => v.statut === 'brouillon')
                .map(vote => (
                  <VoteCard 
                    key={vote.id} 
                    vote={vote} 
                    onUpdate={refresh}
                  />
                ))}
            </>
          )}
        </div>
      )}

      {/* Modal de création */}
      {showCreator && (
        <VoteCreator
          context={{ module: 'ag', id: agId }}
          onClose={() => setShowCreator(false)}
          onSuccess={() => {
            setShowCreator(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}