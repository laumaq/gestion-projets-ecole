'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCoursLogiquesForTeacher } from '@/lib/cahier-cotes/queries';
import { CoursLogique } from '@/lib/cahier-cotes/types';
import { getAnneeScolaireCourante } from '@/lib/cahier-cotes/constants';

export default function CahierCotesIndexPage() {
  const [cours, setCours] = useState<CoursLogique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const anneeScolaire = getAnneeScolaireCourante();

  useEffect(() => {
    const employeeId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');

    console.log('🔍 DEBUG START');
    console.log('  employeeId:', employeeId);
    console.log('  userType:', userType);
    console.log('  anneeScolaire:', anneeScolaire);

    if (!employeeId || userType !== 'employee') {
      console.log('  → redirect car pas employee');
      router.push('/');
      return;
    }

    getCoursLogiquesForTeacher(employeeId, anneeScolaire)
      .then(data => {
        console.log('  → cours reçus:', data);
        console.log('  → nb cours:', data.length);
        setCours(data);
      })
      .catch(e => {
        console.error('  → ERREUR:', e);
        setError(e.message);
      })
      .finally(() => {
        console.log('🔍 DEBUG END');
        setLoading(false);
      });
  }, [router, anneeScolaire]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">Erreur : {error}</div>;
  }

  // Regrouper par matière
  const coursParMatiere = cours.reduce((acc, cl) => {
    const matiere = cl.matiere || 'Sans matière';
    if (!acc[matiere]) acc[matiere] = [];
    acc[matiere].push(cl);
    return acc;
  }, {} as Record<string, CoursLogique[]>);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Cahier de cotes</h1>
      <p className="text-sm text-gray-600 mb-6">Année scolaire {anneeScolaire}</p>

      {cours.length === 0 ? (
        <div className="text-center py-12 bg-white rounded border border-gray-200">
          <p className="text-gray-600">Aucun cours ne t'est associé pour le moment.</p>
          <p className="text-sm text-gray-500 mt-2">
            Si un cours manque, contacte l'administrateur.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(coursParMatiere).map(([matiere, liste]) => (
            <div key={matiere}>
              <h2 className="text-lg font-semibold mb-2 text-gray-700">{matiere}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {liste.map(cl => (
                  <Link
                    key={cl.id}
                    href={`/tools/cahier-cotes/${cl.id}?annee=${anneeScolaire}`}
                    className="block p-4 bg-white border border-gray-200 rounded hover:border-blue-400 hover:shadow transition"
                  >
                    <div className="font-medium">
                      {cl.nom_affichage ?? `${cl.matiere} ${cl.groupe_pedagogique}`}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{cl.groupe_pedagogique}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}