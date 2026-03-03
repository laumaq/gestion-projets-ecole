// app/tools/ag/preparation/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAGPermissions } from '@/hooks/useAGPermissions';
import { useAGData } from '@/hooks/useAGData';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AGPreparationPage() {
  const router = useRouter();
  const { agStatut, canSubmit, loading: permissionsLoading } = useAGPermissions();
  const { 
    groupes, 
    employees, 
    communications, 
    saveCommunication,
    loading: dataLoading 
  } = useAGData();
  
  const [monGroupe, setMonGroupe] = useState<{ id: string; nom: string } | null>(null);
  const [maCommunication, setMaCommunication] = useState<any>(null);
  const [temps, setTemps] = useState('5');
  const [type, setType] = useState<'information' | 'consultation' | 'decision'>('information');
  const [resume, setResume] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && !canSubmit) {
      router.push('/dashboard');
    }
  }, [canSubmit, permissionsLoading, router]);

  useEffect(() => {
    if (!dataLoading && employees.length > 0) {
      const userId = localStorage.getItem('userId');
      const employee = employees.find(e => e.id === userId);
      
      if (employee?.groupe_id) {
        const groupe = groupes.find(g => g.id === employee.groupe_id);
        setMonGroupe({
          id: employee.groupe_id,
          nom: groupe?.nom || 'Groupe inconnu'
        });

        // Chercher la communication existante pour ce groupe
        const comm = communications.find(c => c.groupe_id === employee.groupe_id);
        if (comm) {
          setMaCommunication(comm);
          setTemps(comm.temps_demande.toString());
          setType(comm.type_communication as any);
          setResume(comm.resume || '');
        }
      }
    }
  }, [dataLoading, employees, groupes, communications]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monGroupe) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const tempsValue = parseInt(temps);
      if (isNaN(tempsValue) || tempsValue < 1) {
        throw new Error('Le temps doit être un nombre positif');
      }

      await saveCommunication(monGroupe.id, {
        temps_demande: tempsValue,
        type_communication: type,
        resume: resume
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading || dataLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!monGroupe) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-yellow-800 mb-2">Vous n'êtes pas assigné à un groupe</h2>
          <p className="text-sm text-yellow-600">
            Contactez la direction pour être assigné à un groupe de travail.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Préparation de l'Assemblée Générale</h1>
      <p className="text-gray-500 mb-8">Groupe : <span className="font-semibold">{monGroupe.nom}</span></p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">Votre communication a été enregistrée !</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Temps demandé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temps nécessaire (en minutes)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={temps}
              onChange={(e) => setTemps(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Le temps final sera ajusté en fonction du temps total disponible
            </p>
          </div>

          {/* Type de communication */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de communication
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setType('information')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  type === 'information'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Information
              </button>
              <button
                type="button"
                onClick={() => setType('consultation')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  type === 'consultation'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Consultation
              </button>
              <button
                type="button"
                onClick={() => setType('decision')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  type === 'decision'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Décision
              </button>
            </div>
          </div>

          {/* Résumé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Résumé de votre communication
            </label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Décrivez brièvement ce que vous allez présenter..."
              required
            />
          </div>

          {/* Bouton submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : maCommunication ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>

          {maCommunication && (
            <div className="text-xs text-gray-500 border-t pt-4">
              Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
