// /app/archives/voyages/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Voyage {
  id: string;
  nom: string;
  destination: string;
  date_debut: string;
  date_fin: string;
  statut: string;
}

export default function ArchivesVoyagesPage() {
  const router = useRouter();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const type = localStorage.getItem('userType') as 'employee' | 'student';

    if (!userId) {
      router.push('/');
      return;
    }

    chargerVoyages(userId, type);
  }, [router]);

  const chargerVoyages = async (userId: string, type: 'employee' | 'student') => {
    try {
      let voyagesIds: string[] = [];

      if (type === 'employee') {
        const { data } = await supabase
          .from('voyage_professeurs')
          .select('voyage_id')
          .eq('professeur_id', userId);
        voyagesIds = data?.map(v => v.voyage_id) || [];
      } else {
        const { data } = await supabase
          .from('voyage_participants')
          .select('voyage_id')
          .eq('eleve_id', parseInt(userId));
        voyagesIds = data?.map(v => v.voyage_id) || [];
      }

      if (voyagesIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('voyages')
        .select('*')
        .in('id', voyagesIds)
        .eq('statut', 'archive')
        .order('date_fin', { ascending: false });

      setVoyages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement des archives...</div>;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/archives" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Retour aux archives
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">✈️ Archives Voyages</h1>
        <p className="text-gray-600 mt-1">
          {voyages.length} voyage{voyages.length > 1 ? 's' : ''} archivé{voyages.length > 1 ? 's' : ''}
        </p>
      </div>

      {voyages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-gray-500">Aucun voyage archivé pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voyages.map((voyage) => (
            <Link
              key={voyage.id}
              href={`/tools/voyages/${voyage.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-medium text-gray-900">{voyage.nom}</h2>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  📦 Archivé
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{voyage.destination}</p>
              <p className="text-xs text-gray-500">
                {new Date(voyage.date_debut).toLocaleDateString('fr-FR')} -{' '}
                {new Date(voyage.date_fin).toLocaleDateString('fr-FR')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}