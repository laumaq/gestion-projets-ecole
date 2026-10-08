'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ItineraireCompetences } from '@/components/cahier-cotes/ItineraireCompetences';
import { loadCahierCotes } from '@/lib/cahier-cotes/queries';
import { getAnneeScolaireCourante } from '@/lib/cahier-cotes/constants';
import { CahierCotesData } from '@/lib/cahier-cotes/types';

export default function ItinerairePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const coursLogiqueId = params.coursLogiqueId as string;

  const anneeScolaire = searchParams.get('annee') ?? getAnneeScolaireCourante();

  const [data, setData] = useState<CahierCotesData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const type = localStorage.getItem('userType');
    if (!id || type !== 'employee') {
      router.push('/');
      return;
    }
    setEmployeeId(id);
  }, [router]);

  useEffect(() => {
    if (!employeeId || !coursLogiqueId) return;
    loadCahierCotes(coursLogiqueId, 'P1', anneeScolaire)
      .then(setData)
      .catch((e: any) => setError(e.message));
  }, [coursLogiqueId, anneeScolaire, employeeId]);

  if (error) return <div className="p-6 text-red-600">Erreur : {error}</div>;
  if (!data || !employeeId) {
    return <div className="p-6 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
      <ItineraireCompetences
        initialData={data}
        anneeScolaire={anneeScolaire}
        employeeId={employeeId}
      />
    </div>
  );
}