// app/dashboard/page.tsx
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

export default function DashboardPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userId, setUserId] = useState('');
  const [userJob, setUserJob] = useState('');
  const [mesVoyages, setMesVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const id = localStorage.getItem('userId');
    const job = localStorage.getItem('userJob');

    if (!type || !id) {
      router.push('/');
      return;
    }

    setUserType(type);
    setUserId(id);
    setUserJob(job || '');

    // Charger les voyages où l'utilisateur est impliqué
    chargerMesVoyages(type, id);
  }, [router]);

  const chargerMesVoyages = async (type: string, id: string) => {
    try {
      setLoading(true);
      
      if (type === 'employee') {
        const { data: voyagesProf, error } = await supabase
          .from('voyage_professeurs')
          .select(`
            voyage_id,
            voyages:voyage_id (
              id,
              nom,
              destination,
              date_debut,
              date_fin,
              statut
            )
          `)
          .eq('professeur_id', id);

        if (error) {
          console.error('Erreur Supabase:', error);
          setMesVoyages([]);
        } else if (voyagesProf) {
          const voyages = voyagesProf
            .map((item: any) => item.voyages)
            .filter((voyage): voyage is Voyage => 
              voyage !== null && 
              typeof voyage === 'object' &&
              'id' in voyage &&
              'nom' in voyage
            );
          setMesVoyages(voyages);
        }
      } else {
        const { data: voyagesEleve, error } = await supabase
          .from('voyage_participants')
          .select(`
            voyage_id,
            voyages:voyage_id (
              id,
              nom,
              destination,
              date_debut,
              date_fin,
              statut
            )
          `)
          .eq('eleve_id', parseInt(id));

        if (error) {
          console.error('Erreur Supabase:', error);
          setMesVoyages([]);
        } else if (voyagesEleve) {
          const voyages = voyagesEleve
            .map((item: any) => item.voyages)
            .filter((voyage): voyage is Voyage => 
              voyage !== null && 
              typeof voyage === 'object' &&
              'id' in voyage &&
              'nom' in voyage
            );
          setMesVoyages(voyages);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des voyages:', error);
      setMesVoyages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

      {/* Outils généraux */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Outils disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Assemblée Générale */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-75 cursor-not-allowed">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Assemblée Générale</h3>
            <p className="text-sm text-gray-500">Bientôt disponible</p>
          </div>

          {/* Groupe de Travail - Prof only */}
          {userType === 'employee' && userJob === 'prof' && (
            <Link href="/tools/projet-5eme" className="block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Groupe de Travail</h3>
                <p className="text-sm text-gray-500">Projet 5e</p>
              </div>
            </Link>
          )}

          {/* Travail de fin d'humanité */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-75 cursor-not-allowed">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Travail de fin d'humanité</h3>
            <p className="text-sm text-gray-500">Bientôt disponible</p>
          </div>

          {/* Gestion de projets */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-75 cursor-not-allowed">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Gestion de projets</h3>
            <p className="text-sm text-gray-500">Bientôt disponible</p>
          </div>
        </div>
      </div>

      {/* Mes voyages */}
      {mesVoyages.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Mes voyages</h2>
          {loading ? (
            <p className="text-gray-500">Chargement des voyages...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mesVoyages.map((voyage) => (
                <Link 
                  key={voyage.id} 
                  href={`/tools/voyages/${voyage.id}`}
                  className="block"
                >
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{voyage.nom}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        voyage.statut === 'préparation' ? 'bg-yellow-100 text-yellow-800' :
                        voyage.statut === 'confirmé' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {voyage.statut}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{voyage.destination}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(voyage.date_debut).toLocaleDateString('fr-FR')} - {new Date(voyage.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && mesVoyages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Vous n'êtes impliqué dans aucun voyage pour le moment.</p>
        </div>
      )}
    </main>
  );
}
