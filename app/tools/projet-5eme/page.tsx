// app/tools/projet-5eme/page.tsx
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

export default function Projet5emePage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userId, setUserId] = useState('');
  const [voyage5eme, setVoyage5eme] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'authentification
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const id = localStorage.getItem('userId');

    if (!type || !id) {
      router.push('/');
      return;
    }

    setUserType(type);
    setUserId(id);

    // Chercher le voyage de 5ème
    chercherVoyage5eme();
  }, [router]);

  const chercherVoyage5eme = async () => {
    try {
      setLoading(true);
      
      // Recherche d'un voyage qui contient "5ème" ou "5e" dans son nom
      const { data, error } = await supabase
        .from('voyages')
        .select('*')
        .or('nom.ilike.%5ème%,nom.ilike.%5e%')
        .order('date_debut', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = aucune ligne trouvée
        console.error('Erreur lors de la recherche:', error);
      }

      setVoyage5eme(data || null);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Groupe de Travail - Projet 5ème
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option 1: Outil de planification des voyages */}
            <Link href="/tools/voyages" className="block">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 hover:shadow-lg transition text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Planification des voyages</h2>
                <p className="text-gray-600 mb-6">
                  Accéder à l'outil général de gestion des voyages pour créer et organiser tous les voyages
                </p>
                <span className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
                  Ouvrir l'outil
                </span>
              </div>
            </Link>

            {/* Option 2: Voyage spécifique des 5ème (si trouvé) */}
            {voyage5eme ? (
              <Link href={`/tools/voyages/${voyage5eme.id}`} className="block">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 hover:shadow-lg transition text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{voyage5eme.nom}</h2>
                  <p className="text-gray-600 mb-2">{voyage5eme.destination}</p>
                  <p className="text-sm text-gray-500 mb-6">
                    {new Date(voyage5eme.date_debut).toLocaleDateString('fr-FR')} - {new Date(voyage5eme.date_fin).toLocaleDateString('fr-FR')}
                  </p>
                  <span className={`inline-block px-6 py-3 rounded-lg font-medium ${
                    voyage5eme.statut === 'préparation' ? 'bg-yellow-500 text-white' :
                    voyage5eme.statut === 'confirmé' ? 'bg-green-500 text-white' :
                    'bg-gray-500 text-white'
                  } hover:opacity-90 transition`}>
                    Gérer ce voyage
                  </span>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 opacity-75 cursor-not-allowed">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-500 mb-3">Voyage de 5ème</h2>
                <p className="text-gray-400 mb-6">
                  Aucun voyage de 5ème n'a encore été créé dans la base de données
                </p>
                <span className="inline-block bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
                  Non disponible
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note pour l'utilisateur */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Les deux options sont disponibles :</p>
          <ul className="mt-2 space-y-1">
            <li>• L'outil général de planification des voyages</li>
            <li>• Le lien direct vers le voyage des 5ème s'il existe</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
