// app/tools/sciences/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Experience {
  id: string;
  nom: string;
  description: string;
  classe: string;
  created_at: string;
  statut: string;
  config: any;
  _count?: {
    mesures: number;
  };
}

export default function SciencesPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userJob, setUserJob] = useState('');
  const [userClass, setUserClass] = useState('');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const id = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');
    const job = localStorage.getItem('userJob');
    const classe = localStorage.getItem('userClass');

    if (!type || !id) {
      router.push('/');
      return;
    }

    setUserType(type);
    setUserId(id);
    setUserName(name || '');
    setUserJob(job || '');
    setUserClass(classe || '');
    chargerExperiences(type, id, classe || '');
  }, [router]);

  const chargerExperiences = async (type: string, id: string, classe: string) => {
    try {
      setLoading(true);

      if (type === 'employee') {
        // Les profs voient toutes les expériences qu'ils ont créées
        const { data, error } = await supabase
          .from('experiences')
          .select(`
            *,
            experience_mesures (
              count
            )
          `)
          .eq('created_by', id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const experiencesAvecCompteur = data?.map(exp => ({
          ...exp,
          _count: {
            mesures: exp.experience_mesures?.[0]?.count || 0
          }
        })) || [];
        
        setExperiences(experiencesAvecCompteur);
      } else {
        // Les élèves voient les expériences de leur classe
        const { data, error } = await supabase
          .from('experiences')
          .select(`
            *,
            experience_mesures (
              count
            )
          `)
          .eq('classe', classe)
          .eq('statut', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const experiencesAvecCompteur = data?.map(exp => ({
          ...exp,
          _count: {
            mesures: exp.experience_mesures?.[0]?.count || 0
          }
        })) || [];
        
        setExperiences(experiencesAvecCompteur);
      }
    } catch (error) {
      console.error('Erreur chargement expériences:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Bannière de bienvenue personnalisée */}
      <div className="mb-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">
          Bonjour {userName || 'utilisateur'} !
        </h2>
        <p>
          {userType === 'employee' 
            ? 'Espace sciences - Créez et gérez vos expériences collaboratives'
            : 'Espace sciences - Participez aux expériences de votre classe'}
        </p>
      </div>

      {/* Outils scientifiques */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Outils scientifiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Simulateur de circuits - Visible par tous */}
          <Link href="/tools/sciences/circuit-constructor" className="block">
            <div className="bg-white rounded-lg shadow-sm border-2 border-yellow-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">⚡ Simulateur de circuits</h3>
              <p className="text-sm text-gray-500">
                Simulez des circuits électriques (Piles, Résistances, Mesures)
              </p>
            </div>
          </Link>

          {/* Nouvelle expérience - Prof only */}
          {userType === 'employee' && (
            <Link href="/tools/sciences/nouvelle-experience" className="block">
              <div className="bg-white rounded-lg shadow-sm border-2 border-green-400 p-6 hover:shadow-md transition transform hover:scale-105 cursor-pointer">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">➕ Nouvelle expérience</h3>
                <p className="text-sm text-gray-500">
                  Créer une expérience collaborative pour votre classe
                </p>
              </div>
            </Link>
          )}

          {/* Placeholder pour futurs outils scientifiques */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">📊 Analyse de données</h3>
            <p className="text-sm text-gray-500">Bientôt disponible</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">🔬 Laboratoire virtuel</h3>
            <p className="text-sm text-gray-500">Bientôt disponible</p>
          </div>
        </div>
      </div>

      {/* Mes expériences */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          {userType === 'employee' ? 'Mes expériences' : 'Expériences en cours'}
        </h2>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Chargement des expériences...</p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {userType === 'employee' 
                ? 'Aucune expérience créée'
                : 'Aucune expérience en cours'}
            </h3>
            <p className="text-gray-500">
              {userType === 'employee'
                ? 'Cliquez sur "Nouvelle expérience" pour commencer'
                : 'Vos professeurs n\'ont pas encore ouvert d\'expérience pour votre classe'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp) => (
              <Link 
                key={exp.id} 
                href={`/tools/sciences/experiences/${exp.id}`}
                className="block"
              >
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition hover:border-green-300">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{exp.nom}</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {exp.classe}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {exp.description || 'Aucune description'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Créée le {new Date(exp.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    {exp._count && (
                      <span className="bg-gray-100 px-2 py-1 rounded-full">
                        {exp._count.mesures} mesure{exp._count.mesures > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {userType === 'student' && (
                    <div className="mt-3 text-xs text-green-600 font-medium">
                      Cliquez pour participer →
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}