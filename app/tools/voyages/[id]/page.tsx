'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ParticipantsList from '@/components/voyages/ParticipantsList';
import HebergementConfigs from '@/components/voyages/HebergementConfigs';

export default function VoyageDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [voyage, setVoyage] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('participants');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVoyage();
  }, [id]);

  const loadVoyage = async () => {
    const { data, error } = await supabase
      .from('voyages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      router.push('/tools/voyages');
      return;
    }

    setVoyage(data);
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <Link 
              href="/tools/voyages" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center mb-2"
            >
              ← Retour aux voyages
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{voyage.nom}</h1>
            <div className="flex gap-4 mt-2 text-gray-600">
              <span>📍 {voyage.destination}</span>
              <span>📅 {new Date(voyage.date_debut).toLocaleDateString('fr-FR')} - {new Date(voyage.date_fin).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {/* TODO: paramètres */}}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              ⚙️ Paramètres
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white rounded-t-xl">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'participants', label: '👥 Participants', icon: '👥' },
            { id: 'hebergement', label: '🏨 Hébergement', icon: '🏨' },
            { id: 'planning', label: '📅 Planning', icon: '📅' },
            { id: 'documents', label: '📎 Documents', icon: '📎' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des tabs */}
      <div className="bg-white rounded-xl shadow p-6">
        {activeTab === 'participants' && <ParticipantsList voyageId={id as string} />}
        {activeTab === 'hebergement' && <HebergementConfigs voyageId={id as string} />}
        {activeTab === 'planning' && (
          <div className="text-center py-12 text-gray-500">
            Planning en cours de développement
          </div>
        )}
        {activeTab === 'documents' && (
          <div className="text-center py-12 text-gray-500">
            Gestion des documents à venir
          </div>
        )}
      </div>
    </div>
  );
}
