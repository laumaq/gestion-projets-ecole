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
    interventionsLibres,
    saveCommunication,
    saveInterventionLibre,
    deleteInterventionLibre,
    loading: dataLoading 
  } = useAGData();
  
  const [monGroupe, setMonGroupe] = useState<{ id: string; nom: string } | null>(null);
  const [monInterventionLibre, setMonInterventionLibre] = useState<any>(null);
  const [mode, setMode] = useState<'gt' | 'libre'>('gt');
  const [titre, setTitre] = useState('');
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
    if (!dataLoading) {
      const userId = localStorage.getItem('userId');
      const employee = employees.find(e => e.id === userId);
      
      // Vérifier si l'employé a un GT
      if (employee?.groupe_id) {
        const groupe = groupes.find(g => g.id === employee.groupe_id);
        setMonGroupe({
          id: employee.groupe_id,
          nom: groupe?.nom || 'Groupe inconnu'
        });

        const comm = communications.find(c => c.groupe_id === employee.groupe_id);
        if (comm) {
          setMode('gt');
          setTemps(comm.temps_demande.toString());
          setType(comm.type_communication as any);
          setResume(comm.resume || '');
        }
      }

      // Vérifier si l'employé a une intervention libre
      const libre = interventionsLibres.find(i => i.employee_id === userId);
      if (libre) {
        setMonInterventionLibre(libre);
        setMode('libre');
        setTitre(libre.titre);
        setTemps(libre.temps_demande.toString());
        setType(libre.type_communication as any);
        setResume(libre.resume || '');
      }
    }
  }, [dataLoading, employees, groupes, communications, interventionsLibres]);

  const handleSubmitGT = async (e: React.FormEvent) => {
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

  const handleSubmitLibre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre) {
      setError('Veuillez donner un titre à votre intervention');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const tempsValue = parseInt(temps);
      if (isNaN(tempsValue) || tempsValue < 1) {
        throw new Error('Le temps doit être un nombre positif');
      }

      await saveInterventionLibre({
        titre,
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

  const handleDeleteLibre = async () => {
    if (!monInterventionLibre) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre intervention ?')) return;

    setSaving(true);
    try {
      await deleteInterventionLibre(monInterventionLibre.id);
      setMonInterventionLibre(null);
      setMode('gt');
      setTitre('');
      setTemps('5');
      setType('information');
      setResume('');
    } catch (err) {
      setError('Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading || dataLoading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Préparation de l'AG</h1>

      {/* Choix du mode */}
      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        {monGroupe && (
          <button
            onClick={() => setMode('gt')}
            className={`py-2 px-4 text-sm font-medium ${
              mode === 'gt'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mon GT : {monGroupe.nom}
          </button>
        )}
        <button
          onClick={() => setMode('libre')}
          className={`py-2 px-4 text-sm font-medium ${
            mode === 'libre'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Intervention libre
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">Votre intervention a été enregistrée !</p>
        </div>
      )}

      {mode === 'gt' && monGroupe ? (
        <form onSubmit={handleSubmitGT} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Intervention pour {monGroupe.nom}</h2>
          {/* Formulaire GT (identique à avant) */}
          <div className="space-y-6">
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
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Résumé
              </label>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      ) : mode === 'libre' && (
        <form onSubmit={handleSubmitLibre} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Intervention libre</h2>
          
          {monInterventionLibre && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex justify-between items-center">
              <p className="text-sm text-yellow-700">
                Vous avez déjà une intervention libre enregistrée
              </p>
              <button
                type="button"
                onClick={handleDeleteLibre}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Supprimer
              </button>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de l'intervention
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Ex: Point sur les sorties scolaires"
                required
              />
            </div>

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
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Résumé
              </label>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : monInterventionLibre ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
