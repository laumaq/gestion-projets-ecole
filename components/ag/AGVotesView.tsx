// components/ag/AGVotesView.tsx
'use client';

import { useState } from 'react';
import { useVotes } from '@/hooks/votes/useVotes';
import { VoteCard } from '@/components/votes/VoteCard';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface AGVotesViewProps {
  agId: string;
}

export default function AGVotesView({ agId }: AGVotesViewProps) {
  const { votes, loading } = useVotes({ module: 'ag', id: agId });
  const [filter, setFilter] = useState<'all' | 'actif' | 'cloture'>('all');

  // Regrouper les votes par intervention
  const votesParIntervention = votes.reduce((acc, vote) => {
    const key = vote.communication_id || vote.intervention_libre_id || 'global';
    if (!acc[key]) acc[key] = [];
    acc[key].push(vote);
    return acc;
  }, {} as Record<string, typeof votes>);

  const votesFiltres = votes.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'actif') return v.statut === 'actif';
    if (filter === 'cloture') return v.statut === 'cloture';
    return true;
  });

  const votesActifs = votes.filter(v => v.statut === 'actif').length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">Chargement des votes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Tous les votes</h2>
        {votesActifs > 0 && (
          <p className="text-sm text-green-600 mt-1">
            {votesActifs} vote{votesActifs > 1 ? 's' : ''} en cours
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tous ({votes.length})
        </button>
        <button
          onClick={() => setFilter('actif')}
          className={`px-4 py-2 text-sm font-medium ${
            filter === 'actif'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          En cours ({votes.filter(v => v.statut === 'actif').length})
        </button>
        <button
          onClick={() => setFilter('cloture')}
          className={`px-4 py-2 text-sm font-medium ${
            filter === 'cloture'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Clôturés ({votes.filter(v => v.statut === 'cloture').length})
        </button>
      </div>

      {votesFiltres.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun vote à afficher</p>
        </div>
      ) : (
        <div className="space-y-4">
          {votesFiltres.map(vote => (
            <VoteCard key={vote.id} vote={vote} />
          ))}
        </div>
      )}
    </div>
  );
}