'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';


export default function LoginPage() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    localStorage.clear();
    
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const nomNormalized = nom.trim().toUpperCase();
      const prenomNormalized = prenom.trim();

      console.log("Tentative de connexion:", {
        nom: nomNormalized,
        prenom: prenomNormalized
      });

      // 1. Recherche dans employees (nom exact + initiale du prénom)
      const initialeNormalized = prenomNormalized.charAt(0).toUpperCase();
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('prenom', prenomNormalized)
        .maybeSingle();

      // 2. Recherche dans students (nom exact + prénom complet)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('prenom', prenomNormalized)
        .maybeSingle();

      // Déterminer quel utilisateur a été trouvé
      const userData = employeeData || studentData;
      const userType = employeeData ? 'employee' : (studentData ? 'student' : null);

      if (!userData || !userType) {
        setError('Utilisateur non trouvé. Vérifiez votre nom et prénom.');
        setLoading(false);
        return;
      }

      const storedPassword = userData.mot_de_passe;


      // CAS 1: PREMIÈRE CONNEXION
      if (!storedPassword || storedPassword === '') {
        console.log("Première connexion - enregistrement du mot de passe");
        
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
          localStorage.setItem('userName', `${userData.prenom} ${userData.nom} `);
          localStorage.setItem('userRole', userData.role || 'employee');
          localStorage.setItem('userJob', userData.job || '');
        } else {
          localStorage.setItem('userType', 'student');
          localStorage.setItem('userId', userData.matricule.toString());
          localStorage.setItem('userName', `${userData.prenom} ${userData.nom}`);
          localStorage.setItem('userClass', userData.classe || '');
          localStorage.setItem('userLevel', userData.niveau || '');
        }
        
        router.push('/dashboard/main');
        return;
      }

      // CAS 2: MOT DE PASSE EXISTANT
      if (storedPassword === password) {
        console.log("Connexion réussie (mot de passe correct)");
        
        if (userType === 'employee') {
          localStorage.setItem('userType', 'employee');
          localStorage.setItem('userId', userData.id);
          localStorage.setItem('userName', `${userData.prenom} ${userData.nom}`);
          localStorage.setItem('userRole', userData.role || 'employee');
          localStorage.setItem('userJob', userData.job || '');
        } else {
          localStorage.setItem('userType', 'student');
          localStorage.setItem('userId', userData.matricule.toString());
          localStorage.setItem('userName', `${userData.prenom} ${userData.nom}`);
          localStorage.setItem('userClass', userData.classe || '');
          localStorage.setItem('userLevel', userData.niveau || '');
        }
        
        router.push('/dashboard/main');
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
            <span className="text-white text-2xl font-bold">Waha</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Portail numérique de l'école
          </h1>
          <p className="text-gray-600">Connexion</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de famille
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
              Prénom
            </label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="Ex: Jean"
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
          <p>Personnel et élèves : utilisez votre nom et prénom</p>
        </div>
      </div>
    </div>
  );
}