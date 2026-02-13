// components/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userJob, setUserJob] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Utilisateur';
    const type = localStorage.getItem('userType') as 'employee' | 'student' || 'employee';
    const job = localStorage.getItem('userJob') || '';
    
    setUserName(name);
    setUserType(type);
    setUserJob(job);
  }, []);

  // Ne pas afficher le header sur la page de connexion
  if (pathname === '/') {
    return null;
  }

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">W</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                Waha Portail de l'école
              </span>
            </Link>
          </div>
          
          {/* Navigation et déconnexion */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/help" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium hidden md:block"
            >
              Aide
            </Link>
            
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{userName}</div>
                <div className="text-xs text-gray-500">
                  {userType === 'employee' 
                    ? (userJob === 'prof' ? 'Professeur' : userJob || 'Personnel') 
                    : 'Élève'}
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Déconnexion
              </button>
            </div>

            {/* Menu mobile button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/help"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Aide
            </Link>
            
            <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
              <div>Connecté en tant que</div>
              <div className="font-medium text-gray-900">{userName}</div>
              <div className="text-xs text-gray-400">
                {userType === 'employee' 
                  ? (userJob === 'prof' ? 'Professeur' : userJob || 'Personnel') 
                  : 'Élève'}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
