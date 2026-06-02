// app/votes/public-list/[voteId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function PublicVoteList() {
  const params = useParams();
  const voteId = params?.voteId as string;
  
  const [hashes, setHashes] = useState<string[]>([]);
  const [voteTitle, setVoteTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicList = async () => {
      try {
        // Récupérer le titre du vote
        const { data: vote } = await supabase
          .from('votes')
          .select('titre')
          .eq('id', voteId)
          .single();
        
        setVoteTitle(vote?.titre || 'Vote');

        // Récupérer tous les hashs publics
        const { data: ballots } = await supabase
          .from('vote_ballots')
          .select('vote_hash, created_at')
          .eq('vote_id', voteId)
          .not('vote_hash', 'is', null)
          .order('created_at', { ascending: true });

        setHashes(ballots?.map(b => b.vote_hash) || []);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    if (voteId) {
      fetchPublicList();
    }
  }, [voteId]);

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Liste publique des votes</h1>
      <h2 className="text-lg text-gray-600 mb-6">{voteTitle}</h2>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600">
          Total des votes : <span className="font-bold">{hashes.length}</span>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          🔍 Pour vérifier votre vote, recherchez votre identifiant dans cette liste.
        </p>
      </div>

      <div className="space-y-1">
        {hashes.map((hash, index) => (
          <div key={hash} className="font-mono text-xs p-1 border-b border-gray-100">
            #{index + 1} : {hash}
          </div>
        ))}
      </div>
    </div>
  );
}