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
    // Lire les infos du localStorage
    const name = localStorage.getItem('userName');
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const job = localStorage.getItem('userJob');
    
    console.log('Header - Données localStorage:', { name, type, job });
    
    if (name) setUserName(name);
    if (type) setUserType(type);
    if (job) setUserJob(job);
  }, [pathname]); // Se relance à chaque changement de page

  if (pathname === '/') return null;

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">
              Waha Portail de l'école
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/help" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              Aide
            </Link>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{userName || 'Chargement...'}</div>
                <div className="text-xs text-gray-500">
                  {userType === 'employee' 
                    ? (userJob === 'prof' ? 'Professeur' : userJob || 'Personnel') 
                    : 'Élève'}
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
