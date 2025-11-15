import { useState } from 'react';
import DashboardProf from './DashboardProf';
import DashboardDirection from './DashboardDirection';

const SUPABASE_URL = 'https://bjbxatevbcrybsrkgdzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnhhdGV2YmNyeWJzcmtnZHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg3ODQsImV4cCI6MjA3NTgyNDc4NH0.PTmREL0Nw1FZTgYDsJk72ABObuOabA7eoaztMPdupPE';
const DIRECTION_PASSWORD = 'wahaDirection';
const DIRECTION_USERS = [
  { nom: 'Catot', initiale: 'S' },
  { nom: 'Creeten', initiale: 'R' },
  { nom: 'Jeangille', initiale: 'L' },
  { nom: 'Maquet', initiale: 'L' }
];

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers,
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }
  return response.json();
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isDirection, setIsDirection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loginNom, setLoginNom] = useState('');
  const [loginInitiale, setLoginInitiale] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginNom || !loginInitiale) return;
    
    setLoading(true);
    setError(null);

    try {
      if (loginPassword) {
        if (loginPassword === DIRECTION_PASSWORD) {
          const isDirectionUser = DIRECTION_USERS.some(
            u => u.nom.toLowerCase() === loginNom.toLowerCase() && 
                 u.initiale.toUpperCase() === loginInitiale.toUpperCase()
          );
          
          if (isDirectionUser) {
            const users = await supabaseRequest(
              `users?nom=eq.${encodeURIComponent(loginNom)}&prenom_initiale=eq.${encodeURIComponent(loginInitiale)}`
            );
            
            let user;
            if (users.length === 0) {
              const [newUser] = await supabaseRequest('users', {
                method: 'POST',
                body: JSON.stringify({
                  nom: loginNom,
                  prenom_initiale: loginInitiale,
                  role: 'direction',
                }),
              });
              user = newUser;
            } else {
              user = users[0];
            }
            
            setCurrentUser(user);
            setIsDirection(true);
            setLoading(false);
            return;
          }
        }
        
        setError('Mot de passe incorrect');
        setLoading(false);
        return;
      }

      const users = await supabaseRequest(
        `users?nom=eq.${encodeURIComponent(loginNom)}&prenom_initiale=eq.${encodeURIComponent(loginInitiale)}`
      );
      
      let user;
      if (users.length === 0) {
        const [newUser] = await supabaseRequest('users', {
          method: 'POST',
          body: JSON.stringify({
            nom: loginNom,
            prenom_initiale: loginInitiale,
            role: 'prof',
          }),
        });
        user = newUser;
      } else {
        user = users[0];
      }
      
      setCurrentUser(user);
      setIsDirection(false);
      setLoading(false);
    } catch (err) {
      setError('Erreur de connexion: ' + err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsDirection(false);
    setLoginNom('');
    setLoginInitiale('');
    setLoginPassword('');
    setError(null);
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Gestion des Projets
          </h1>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={loginNom}
                onChange={(e) => setLoginNom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Dupont"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initiale du prénom
              </label>
              <input
                type="text"
                value={loginInitiale}
                onChange={(e) => setLoginInitiale(e.target.value.toUpperCase())}
                maxLength={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="M"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe <span className="text-gray-400 text-xs">(optionnel - réservé direction)</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Laisser vide pour accès prof"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isDirection) {
    return <DashboardDirection user={currentUser} onLogout={handleLogout} supabaseRequest={supabaseRequest} />;
  }

  return <DashboardProf user={currentUser} onLogout={handleLogout} supabaseRequest={supabaseRequest} />;
}

export default App;
