'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Voyage {
  id: string;
  nom: string;
  destination: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  config_visible_eleves: boolean;
}

export default function VoyagesPage() {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewVoyage, setShowNewVoyage] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadVoyages();
  }, []);

  const loadVoyages = async () => {
    const { data, error } = await supabase
      .from('voyages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setVoyages(data);
    setLoading(false);
  };

  const createVoyage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userId = localStorage.getItem('userId');

    const { data, error } = await supabase
      .from('voyages')
      .insert({
        nom: formData.get('nom'),
        destination: formData.get('destination'),
        date_debut: formData.get('date_debut'),
        date_fin: formData.get('date_fin'),
        annee_scolaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        created_by: userId,
        statut: 'preparation'
      })
      .select()
      .single();

    if (!error && data) {
      router.push(`/tools/voyages/${data.id}`);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Voyages scolaires</h1>
        <button
          onClick={() => setShowNewVoyage(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Nouveau voyage
        </button>
      </div>

      {/* Modal nouveau voyage */}
      {showNewVoyage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Créer un nouveau voyage</h2>
            <form onSubmit={createVoyage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom du voyage</label>
                <input
                  name="nom"
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Voyage des 3ème à Nuremberg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Destination</label>
                <input
                  name="destination"
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Nuremberg, Allemagne"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date début</label>
                  <input
                    name="date_debut"
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date fin</label>
                  <input
                    name="date_fin"
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewVoyage(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste des voyages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {voyages.map((voyage) => (
          <Link
            key={voyage.id}
            href={`/tools/voyages/${voyage.id}`}
            className="block bg-white rounded-xl shadow hover:shadow-lg transition p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{voyage.nom}</h2>
                <p className="text-gray-600 mt-1">{voyage.destination}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                voyage.statut === 'preparation' ? 'bg-yellow-100 text-yellow-800' :
                voyage.statut === 'actif' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {voyage.statut === 'preparation' ? 'Préparation' : 
                 voyage.statut === 'actif' ? 'Actif' : 'Terminé'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>📅 {new Date(voyage.date_debut).toLocaleDateString('fr-FR')} - {new Date(voyage.date_fin).toLocaleDateString('fr-FR')}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
