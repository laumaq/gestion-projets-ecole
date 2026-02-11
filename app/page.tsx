'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

      console.log("Tentative de connexion:", {
        nom: nomNormalized,
        initiale: initialeNormalized
      });

      // Recherche dans la table employees (table unique)
      const { data: userData, error: userError } = await supabase
        .from('employees')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('initiale', initialeNormalized)
        .maybeSingle();

      console.log("Résultat de la requête:", { userData, userError });

      if (userError) {
        console.error("Erreur Supabase:", userError);
        setError('Erreur de connexion à la base de données');
        setLoading(false);
        return;
      }

      if (!userData) {
        console.log("Utilisateur non trouvé");
        setError('Utilisateur non trouvé. Vérifiez votre nom et initiale.');
        setLoading(false);
        return;
      }

      // Dans handleLogin, remplacez la partie comparaison de mot de passe :

      const storedPassword = userData.mot_de_passe;
      console.log("🔐 Mot de passe stocké:", `"${storedPassword}"`);
      console.log("🔐 Mot de passe fourni:", `"${password}"`);
      console.log("🔐 Longueur stocké:", storedPassword?.length);
      console.log("🔐 Longueur fourni:", password.length);
      console.log("🔐 Caractères stocké:", storedPassword ? [...storedPassword].map(c => c.charCodeAt(0)) : []);
      console.log("🔐 Caractères fourni:", [...password].map(c => c.charCodeAt(0)));
      console.log("🔐 Égalité stricte:", storedPassword === password);
      console.log("🔐 Égalité après trim:", storedPassword?.trim() === password?.trim());
      console.log("🔐 Type stocké:", typeof storedPassword);
      console.log("🔐 Type fourni:", typeof password);
      
      // CAS 1: PREMIÈRE CONNEXION (NULL ou chaîne vide)
      if (!storedPassword || storedPassword === '') {
        // ...
      }
      
      // CAS 2: MOT DE PASSE EXISTANT
      if (storedPassword === password) {
        // ...
      } else {
        console.log("❌ Mot de passe incorrect");
        console.log("   Stocké (hex):", storedPassword ? Buffer.from(storedPassword).toString('hex') : 'null');
        console.log("   Fourni (hex):", Buffer.from(password).toString('hex'));
        setError('Mot de passe incorrect');
        setLoading(false);
        return;
      }


    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">TFH</span>
          </div>
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
              placeholder="Ex: DUPONT"
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
              placeholder="Ex: M"
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
              placeholder="Votre mot de passe"
            />
            <p className="text-xs text-gray-500 mt-1">
              Première connexion : créez votre mot de passe
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
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Utilisez votre nom et l'initiale de votre prénom</p>
          <p className="mt-1">Table: employees</p>
        </div>
      </div>
    </div>
  );
}
