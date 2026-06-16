// /components/Header.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, User, LogOut, Home, Calendar, Users, Vote, HelpCircle, Shield } from 'lucide-react';

export default function Header() {
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userJob, setUserJob] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem('userName');
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const job = localStorage.getItem('userJob');
    const id = localStorage.getItem('userId');
        
    if (name) setUserName(name);
    if (type) setUserType(type);
    if (job) setUserJob(job);
    if (id) setUserId(id);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ✅ RETOURNE NULL SUR LA PAGE DE CONNEXION
  if (pathname === '/') return null;

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const adminUUIDs = ['52793bea-994a-4b50-b768-75427df4747b', 'a06b22ec-11f6-49a7-ab8a-13607ff2ac87'];
  const isAdmin = userType === 'employee' && userId && adminUUIDs.includes(userId);

  const navItems = userType === 'employee' ? [
    { href: '/dashboard/main', label: 'Tableau de bord', icon: Home },
    { href: '/voyages', label: 'Voyages', icon: Calendar },
    { href: '/ag', label: 'AG', icon: Users },
    { href: '/votes', label: 'Votes', icon: Vote },
  ] : [
    { href: '/dashboard/main', label: 'Tableau de bord', icon: Home },
    { href: '/voyages/mes-voyages', label: 'Mes voyages', icon: Calendar },
    { href: '/votes', label: 'Votes', icon: Vote },
  ];

  const getRoleDisplay = () => {
    if (userType === 'employee') {
      if (userJob === 'prof') return 'Professeur';
      if (userJob === 'direction') return 'Direction';
      if (userJob === 'administration') return 'Administration';
      if (userJob === 'educ') return 'Éducateur';
      return userJob || 'Personnel';
    }
    return 'Élève';
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg border-b border-gray-100'
          : 'bg-gradient-to-r from-school-green-700 via-school-green-600 to-school-green-500'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo et nom */}
          <Link href="/dashboard/main" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
              <Image
                src="/images/logo/logotype-tampon-forme-courte-vert.png"
                alt="Logo Waha"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className={`text-base md:text-xl font-bold leading-tight ${
                isScrolled ? 'text-school-green-600' : 'text-white'
              }`}>
                Portail Waha
              </span>
              <span className={`text-[10px] md:text-xs font-medium ${
                isScrolled ? 'text-gray-500' : 'text-green-100'
              }`}>
                Outils pédagogiques
              </span>
            </div>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                  isScrolled
                    ? 'text-gray-700 hover:text-school-green-600 hover:bg-school-green-50'
                    : 'text-white hover:text-green-100 hover:bg-white/10'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Droite : Admin, Aide, Profil */}
          <div className="hidden md:flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                  isScrolled
                    ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                    : 'text-yellow-200 hover:text-yellow-100 hover:bg-white/10'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}

            <Link
              href="/help"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                isScrolled
                  ? 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-green-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Aide</span>
            </Link>

            {/* Profil utilisateur */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                isScrolled ? 'bg-school-green-50' : 'bg-white/10 backdrop-blur-sm'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isScrolled ? 'bg-school-green-600' : 'bg-white/20'
                }`}>
                  <User className={`w-4 h-4 ${isScrolled ? 'text-white' : 'text-white'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${
                    isScrolled ? 'text-gray-800' : 'text-white'
                  }`}>
                    {userName || 'Chargement...'}
                  </span>
                  <span className={`text-[10px] ${
                    isScrolled ? 'text-gray-500' : 'text-green-100'
                  }`}>
                    {getRoleDisplay()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className={`p-2 rounded-lg transition-all ${
                  isScrolled
                    ? 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    : 'text-green-100 hover:text-red-200 hover:bg-white/10'
                }`}
                aria-label="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bouton menu mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-all ${
              isScrolled ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isScrolled
                      ? 'text-gray-700 hover:bg-school-green-50'
                      : 'text-white hover:bg-white/10'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isScrolled
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-yellow-200 hover:bg-white/10'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Administration</span>
                </Link>
              )}

              <Link
                href="/help"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isScrolled
                    ? 'text-gray-600 hover:bg-gray-50'
                    : 'text-green-100 hover:bg-white/10'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Aide</span>
              </Link>

              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                isScrolled ? 'bg-school-green-50' : 'bg-white/10'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isScrolled ? 'bg-school-green-600' : 'bg-white/20'
                }`}>
                  <User className={`w-4 h-4 ${isScrolled ? 'text-white' : 'text-white'}`} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    isScrolled ? 'text-gray-800' : 'text-white'
                  }`}>
                    {userName || 'Chargement...'}
                  </div>
                  <div className={`text-xs ${
                    isScrolled ? 'text-gray-500' : 'text-green-100'
                  }`}>
                    {getRoleDisplay()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isScrolled
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-red-200 hover:bg-white/10'
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}