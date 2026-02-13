'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Utilisateur';
    const type = localStorage.getItem('userType') as 'employee' | 'student' || 'employee';
    
    setUserName(name);
    setUserType(type);
  }, []);

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard' },
    { name: 'Outils', href: '/tools' },
    { name: 'Aide', href: '/help' },
  ];

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">TFH</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                Portail TFH
              </span>
            </Link>
          </div>

          {/* Navigation desktop */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                  pathname === item.href
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center">
            <div className="hidden md:block mr-4 text-right">
              <div className="text-sm font-medium text-gray-700">{userName}</div>
              <div className="text-xs text-gray-500">
                {userType === 'employee' ? 'Personnel' : 'Élève'}
              </div>
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
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === item.href
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="px-3 py-2 text-sm text-gray-500 border-t">
              <div>Connecté en tant que</div>
              <div className="font-medium">{userName}</div>
              <div className="text-xs text-gray-400">
                {userType === 'employee' ? 'Personnel' : 'Élève'}
              </div>
            </div>
            <button
              className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium"
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
