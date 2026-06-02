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
  const [voteDescription, setVoteDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    const fetchPublicList = async () => {
      try {
        // Récupérer les infos du vote
        const { data: vote, error: voteError } = await supabase
          .from('votes')
          .select('titre, description')
          .eq('id', voteId)
          .single();
        
        if (voteError) throw voteError;
        
        setVoteTitle(vote?.titre || 'Vote');
        setVoteDescription(vote?.description || '');

        // Récupérer tous les hashs publics
        const { data: ballots, error: ballotsError } = await supabase
          .from('vote_ballots')
          .select('vote_hash, created_at')
          .eq('vote_id', voteId)
          .not('vote_hash', 'is', null)
          .order('created_at', { ascending: true });

        if (ballotsError) throw ballotsError;

        const hashList = ballots?.map(b => b.vote_hash) || [];
        setHashes(hashList);
        setTotalVotes(hashList.length);
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

  // Filtrer les hashs par recherche
  const filteredHashes = searchTerm 
    ? hashes.filter(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
    : hashes;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-8">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">📋 Liste publique des votes</h1>
      <h2 className="text-lg text-gray-600 mb-1">{voteTitle}</h2>
      {voteDescription && (
        <p className="text-sm text-gray-500 mb-6">{voteDescription}</p>
      )}
      
      {/* Statistiques */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total des votes enregistrés :</span>
          <span className="text-2xl font-bold text-blue-600">{totalVotes}</span>
        </div>
      </div>

      {/* Champ de recherche */}
      {totalVotes > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Rechercher votre identifiant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <p className="text-xs text-gray-500 mt-1">
              {filteredHashes.length} résultat{filteredHashes.length > 1 ? 's' : ''} trouvé{filteredHashes.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Liste des hashs */}
      {totalVotes === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun vote enregistré pour le moment.</p>
          <p className="text-xs text-gray-400 mt-2">
            Les identifiants apparaîtront ici dès que des votes seront soumis.
          </p>
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto border rounded-lg p-2 bg-gray-50">
          {filteredHashes.map((hash, index) => (
            <div 
              key={hash} 
              className={`font-mono text-xs p-2 rounded ${
                searchTerm && hash.toLowerCase().includes(searchTerm.toLowerCase())
                  ? 'bg-yellow-100 border-l-4 border-yellow-500'
                  : 'hover:bg-gray-100'
              }`}
            >
              #{index + 1} : {hash}
            </div>
          ))}
        </div>
      )}

      {/* Légende */}
      {totalVotes > 0 && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          🔍 Pour vérifier votre vote, recherchez votre identifiant dans cette liste.<br />
          Si vous le trouvez, votre vote a bien été compté.
        </p>
      )}
    </div>
  );
}