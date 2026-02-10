'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function LoginPage() {
  const [nom, setNom] = useState('');
  const [initiale, setInitiale] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const nomNormalized = nom.trim().toUpperCase();
      const initialeNormalized = initiale.trim().toUpperCase();

      // Recherche dans la table employees (utilisateurs unifiés)
      const { data: userData, error: userError } = await supabase
        .from('employees')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('initiale', initialeNormalized)
        .maybeSingle();

      if (userError || !userData) {
        setError('Utilisateur non trouvé');
        setLoading(false);
        return;
      }

      const storedPassword = userData.mot_de_passe;

      // Première connexion
      if (!storedPassword || storedPassword === '') {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ mot_de_passe: password })
          .eq('id', userData.id);

        if (updateError) {
          setError('Erreur lors de la création du mot de passe');
          setLoading(false);
          return;
        }
      } else if (storedPassword !== password) {
        setError('Mot de passe incorrect');
        setLoading(false);
        return;
      }

      // Stockage des infos utilisateur
      localStorage.setItem('userType', userData.role || 'employee');
      localStorage.setItem('userId', userData.id);
      localStorage.setItem('userName', `${userData.nom} ${userData.initiale}.`);
      localStorage.setItem('userRole', userData.role || 'employee');

      router.push('/dashboard');
      
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError('Erreur technique');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Portail TFH
          </h1>
          <p className="text-gray-600">Outils pédagogiques</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initiale du prénom
            </label>
            <input
              type="text"
              value={initiale}
              onChange={(e) => setInitiale(e.target.value.toUpperCase())}
              maxLength={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Première connexion : ce sera votre mot de passe
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
