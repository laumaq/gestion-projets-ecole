'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { CahierCotesClient } from '@/components/cahier-cotes/CahierCotesClient';
import { HistoriqueMenu } from '@/components/cahier-cotes/HistoriqueMenu';
import { loadCahierCotes } from '@/lib/cahier-cotes/queries';
import { getAnneeScolaireCourante } from '@/lib/cahier-cotes/constants';
import { CahierCotesData } from '@/lib/cahier-cotes/types';

export default function CahierCotesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const coursLogiqueId = params.coursLogiqueId as string;   // ⭐ UUID string

  const [data, setData] = useState<CahierCotesData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const anneeScolaire = searchParams.get('annee') ?? getAnneeScolaireCourante();

  // ─── Auth check ───
  useEffect(() => {
    const id = localStorage.getItem('userId');
    const type = localStorage.getItem('userType');
    const name = localStorage.getItem('userName') ?? '';

    if (!id || type !== 'employee') {
      router.push('/');
      return;
    }
    setEmployeeId(id);
    setEmployeeName(name);
  }, [router]);

  // ─── Chargement des données ───
  useEffect(() => {
    if (!employeeId) return;
    if (!coursLogiqueId) {
      setError('Identifiant de cours invalide.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    loadCahierCotes(coursLogiqueId, 'P1', anneeScolaire)
      .then(setData)
      .catch((e: any) => setError(e.message ?? 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [coursLogiqueId, anneeScolaire, employeeId]);

  // ─── Rendu ───
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Chargement du cahier de cotes...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">
          {error ?? 'Données introuvables'}
        </div>
        <button
          onClick={() => router.push('/tools/cahier-cotes')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ← Retour à la liste des cours
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
      {/* Barre supérieure */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
        <div className="min-w-0">
          <button
            onClick={() => router.push('/tools/cahier-cotes')}
            className="text-xs text-blue-600 hover:underline mb-0.5 block"
          >
            ← Tous mes cours
          </button>
          <h1 className="text-lg font-semibold truncate">
            {data.coursLogique.nom_affichage ?? data.coursLogique.matiere}
          </h1>
          <p className="text-xs text-gray-500">
            {data.coursLogique.groupe_pedagogique}
            {data.eleves.length > 0 && ` • ${data.eleves.length} élèves`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HistoriqueMenu
            anneeCourante={anneeScolaire}
            coursLogiqueId={coursLogiqueId}
          />
          <a
            href={`/tools/cahier-cotes/${coursLogiqueId}/itineraire?annee=${anneeScolaire}`}
            className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm whitespace-nowrap"
          >
            Itinéraire des compétences
          </a>
        </div>
      </div>

      {/* Cahier de cotes */}
      <CahierCotesClient
        initialData={data}
        anneeScolaire={anneeScolaire}
        employeeId={employeeId!}
        employeeName={employeeName}
      />
    </div>
  );
}