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
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
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
        initiale: initialeNormalized,
        userType
      });

      // Recherche selon le type d'utilisateur
      let userData = null;
      let userError = null;

      if (userType === 'employee') {
        // Recherche dans la table employees
        const result = await supabase
          .from('employees')
          .select('*')
          .ilike('nom', nomNormalized)
          .ilike('initiale', initialeNormalized)
          .maybeSingle();
        
        userData = result.data;
        userError = result.error;
      } else {
        // Recherche dans la table students
        // Pour les élèves, on utilise nom et initiale du prénom
        const result = await supabase
          .from('students')
          .select('*')
          .ilike('nom', nomNormalized)
          .ilike('prenom', initialeNormalized + '%') // Les prénoms commençant par l'initiale
          .maybeSingle();
        
        userData = result.data;
        userError = result.error;
      }

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

      const storedPassword = userData.mot_de_passe;
      
      // DEBUG: Afficher les infos
      console.log("🔐 Mot de passe stocké:", `"${storedPassword}"`);
      console.log("🔐 Mot de passe fourni:", `"${password}"`);
      
      // CAS 1: PREMIÈRE CONNEXION (NULL ou chaîne vide)
      if (!storedPassword || storedPassword === '') {
        console.log("Première connexion - enregistrement du mot de passe");
        
        // Mise à jour selon le type d'utilisateur
        let updateError = null;
        
        if (userType === 'employee') {
          const result = await supabase
            .from('employees')
            .update({ mot_de_passe: password })
            .eq('id', userData.id);
          updateError = result.error;
        } else {
          const result = await supabase
            .from('students')
            .update({ mot_de_passe: password })
            .eq('matricule', userData.matricule);
          updateError = result.error;
        }

        if (updateError) {
          console.error("Erreur d'enregistrement:", updateError);
          setError('Erreur technique lors de la création du mot de passe');
          setLoading(false);
          return;
        }

        // Connecter l'utilisateur
        if (userType === 'employee') {
          localStorage.setItem('userType', 'employee');
          localStorage.setItem('userId', userData.id);
          localStorage.setItem('userName', `${userData.nom} ${userData.initiale}.`);
          localStorage.setItem('userRole', userData.role || 'employee');
          localStorage.setItem('userJob', userData.job || 'employee');
        } else {
          localStorage.setItem('userType', 'student');
          localStorage.setItem('userId', userData.matricule.toString());
          localStorage.setItem('userName', `${userData.prenom} ${userData.nom}`);
          localStorage.setItem('userClass', userData.classe || '');
          localStorage.setItem('userLevel', userData.niveau || '');
        }
        
        console.log("Connexion réussie (première fois)");
        router.push('/dashboard');
        return;
      }

      // CAS 2: MOT DE PASSE EXISTANT
      if (storedPassword === password) {
        console.log("Connexion réussie (mot de passe correct)");
        
        if (userType === 'employee') {
          localStorage.setItem('userType', 'employee');
          localStorage.setItem('userId', userData.id);
          localStorage.setItem('userName', `${userData.nom} ${userData.initiale}.`);
          localStorage.setItem('userRole', userData.role || 'employee');
          localStorage.setItem('userJob', userData.job || 'employee');
        } else {
          localStorage.setItem('userType', 'student');
          localStorage.setItem('userId', userData.matricule.toString());
          localStorage.setItem('userName', `${userData.prenom} ${userData.nom}`);
          localStorage.setItem('userClass', userData.classe || '');
          localStorage.setItem('userLevel', userData.niveau || '');
        }
        
        router.push('/dashboard');
        return;
      } else {
        console.log("❌ Mot de passe incorrect");
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

        {/* Sélecteur de type d'utilisateur */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setUserType('employee')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              userType === 'employee'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Personnel
          </button>
          <button
            type="button"
            onClick={() => setUserType('student')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              userType === 'student'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Élève
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {userType === 'employee' ? 'Nom' : 'Nom de famille'}
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder={userType === 'employee' ? "Ex: DUPONT" : "Ex: MARTIN"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {userType === 'employee' ? 'Initiale du prénom' : 'Première lettre du prénom'}
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
          <p>Utilisez votre nom et la première lettre de votre prénom</p>
        </div>
      </div>
    </div>
  );
}
