// /app/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { User, Lock, LogIn, Sparkles, GraduationCap, School, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState<'nom' | 'prenom' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    localStorage.clear();
    
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const nomNormalized = nom.trim().toUpperCase();
      const prenomNormalized = prenom.trim();

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('prenom', prenomNormalized)
        .maybeSingle();

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .ilike('nom', nomNormalized)
        .ilike('prenom', prenomNormalized)
        .maybeSingle();

      const userData = employeeData || studentData;
      const userType = employeeData ? 'employee' : (studentData ? 'student' : null);

      if (!userData || !userType) {
        setError('Utilisateur non trouvé. Vérifiez votre nom et prénom.');
        setLoading(false);
        return;
      }

      const storedPassword = userData.mot_de_passe;

      if (!storedPassword || storedPassword === '') {
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
          setError('Erreur technique lors de la création du mot de passe');
          setLoading(false);
          return;
        }

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
      }

      if (storedPassword === password) {
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
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Arrière-plan décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      {/* Conteneur principal - deux colonnes sur desktop */}
      <div className="w-full max-w-6xl relative z-10 flex flex-col md:flex-row items-stretch gap-8 md:gap-12">
        
        {/* Colonne gauche - Branding et logo long */}
        <div className="flex-1 flex flex-col items-center justify-center text-center md:text-left p-6 md:p-8">
          {/* Logo long tourné de 90° sur desktop */}
          <div className="hidden md:block relative w-full max-w-md h-48 mx-auto mb-8 animate-float-slow">
            <Image
              src="/images/logo/logotype-forme-longue-B1.png"
              alt="Waha"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
          
          {/* Logo court pour mobile */}
          <div className="md:hidden relative w-24 h-24 mx-auto mb-6">
            <Image
              src="/images/logo/logotype-tampon-forme-courte-vert.png"
              alt="Waha"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-1 h-12 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full hidden md:block"></div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-emerald-700 via-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Portail Numérique
                </h1>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-700 mt-1">
                  de <span className="text-emerald-600">Waha</span>
                </h2>
              </div>
            </div>
            
            <p className="text-gray-500 text-lg md:text-xl flex items-center justify-center md:justify-start gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              <span>Plateforme pédagogique collaborative</span>
            </p>
            
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span>Personnel</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Élèves</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span>Équipe éducative</span>
              </div>
            </div>

            {/* Badges ou statistiques décoratives */}
            <div className="hidden md:flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Outils</p>
                  <p className="text-xs">pédagogiques</p>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <School className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Communauté</p>
                  <p className="text-xs">apprenante</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite - Formulaire de connexion */}
        <div className="flex-1 flex items-center">
          <div className="w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 lg:p-10 border border-white/50 relative overflow-hidden">
            {/* Décoration intérieure */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-400/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-10 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Connexion</h2>
                  <p className="text-sm text-gray-500">Accédez à votre espace personnel</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Champ Nom */}
                <div className="relative">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                    isFocused === 'nom' || nom ? 'text-emerald-500' : 'text-gray-400'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    onFocus={() => setIsFocused('nom')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-2xl focus:bg-white transition-all duration-300 outline-none text-gray-800 placeholder:text-gray-400"
                    style={{
                      borderColor: isFocused === 'nom' ? '#22c55e' : (nom ? '#22c55e' : 'transparent'),
                      boxShadow: isFocused === 'nom' ? '0 0 0 4px rgba(34, 197, 94, 0.1)' : 'none',
                    }}
                    required
                    placeholder="Nom de famille"
                  />
                  {nom && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>

                {/* Champ Prénom */}
                <div className="relative">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                    isFocused === 'prenom' || prenom ? 'text-emerald-500' : 'text-gray-400'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    onFocus={() => setIsFocused('prenom')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-2xl focus:bg-white transition-all duration-300 outline-none text-gray-800 placeholder:text-gray-400"
                    style={{
                      borderColor: isFocused === 'prenom' ? '#22c55e' : (prenom ? '#22c55e' : 'transparent'),
                      boxShadow: isFocused === 'prenom' ? '0 0 0 4px rgba(34, 197, 94, 0.1)' : 'none',
                    }}
                    required
                    placeholder="Prénom"
                  />
                </div>

                {/* Champ Mot de passe */}
                <div className="relative">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                    isFocused === 'password' || password ? 'text-emerald-500' : 'text-gray-400'
                  }`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsFocused('password')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full pl-12 pr-14 py-3.5 bg-gray-50/50 border-2 rounded-2xl focus:bg-white transition-all duration-300 outline-none text-gray-800 placeholder:text-gray-400"
                    style={{
                      borderColor: isFocused === 'password' ? '#22c55e' : (password ? '#22c55e' : 'transparent'),
                      boxShadow: isFocused === 'password' ? '0 0 0 4px rgba(34, 197, 94, 0.1)' : 'none',
                    }}
                    required
                    placeholder="Mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-400 -mt-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Première connexion : créez votre mot de passe
                </p>

                {error && (
                  <div className="p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-2xl text-sm border border-red-100 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 rounded-2xl font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        Se connecter
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100/50">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <School className="w-4 h-4" />
                  <span>Personnel · Élèves · Équipe éducative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-gray-400/60 flex items-center justify-center gap-2">
          <span>© 2026 Waha</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span>Tous droits réservés</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span className="text-emerald-400">✦</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span>Portail pédagogique</span>
        </p>
      </div>
    </div>
  );
}