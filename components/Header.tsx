// /components/Header.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, X, User, LogOut, Home, Calendar, Users, Vote, 
  HelpCircle, Shield, UsersRound, School, Briefcase, 
  GraduationCap, UserCog, BookOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState<'employee' | 'student'>('employee');
  const [userJob, setUserJob] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userClass, setUserClass] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [groupeTravail, setGroupeTravail] = useState<string | null>(null);
  const [classeConseil, setClasseConseil] = useState<string | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem('userName');
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const job = localStorage.getItem('userJob');
    const id = localStorage.getItem('userId');
    const userClassFromStorage = localStorage.getItem('userClass');
        
    if (name) setUserName(name);
    if (type) setUserType(type);
    if (job) setUserJob(job);
    if (id) setUserId(id);
    if (userClassFromStorage) setUserClass(userClassFromStorage);

    // Récupérer les informations supplémentaires
    if (id && type) {
      fetchUserLinks(id, type);
    }
  }, [pathname]);

  const fetchUserLinks = async (id: string, type: 'employee' | 'student') => {
    try {
      // Récupérer l'année scolaire en cours
      const { data: configData } = await supabase
        .from('conseil_classes_config')
        .select('annee_scolaire')
        .order('annee_scolaire', { ascending: false })
        .limit(1)
        .maybeSingle();

      const annee = configData?.annee_scolaire || '2025-2026';

      if (type === 'employee') {
        // Récupérer le groupe de travail de l'employé
        const { data: employeeData } = await supabase
          .from('employees')
          .select('groupe_id')
          .eq('id', id)
          .maybeSingle();

        if (employeeData?.groupe_id) {
          const { data: groupeData } = await supabase
            .from('ag_groupes')
            .select('nom')
            .eq('id', employeeData.groupe_id)
            .maybeSingle();
          
          if (groupeData) {
            setGroupeTravail(groupeData.nom);
          }
        }

        // Récupérer la classe du conseil pour les non-direction et non-educ
        if (userJob !== 'direction' && userJob !== 'educ') {
          const { data: roleData } = await supabase
            .from('conseil_classes_roles')
            .select('classe_nom')
            .eq('annee_scolaire', annee)
            .or(`titulaire_id.eq.${id},co_titulaire_id.eq.${id}`)
            .maybeSingle();

          if (roleData?.classe_nom) {
            setClasseConseil(roleData.classe_nom);
          }
        }
      } else if (type === 'student') {
        // Pour les élèves, utiliser leur classe
        const studentClass = localStorage.getItem('userClass');
        if (studentClass) {
          setClasseConseil(studentClass);
        }
      }

      setLoadingLinks(false);
    } catch (error) {
      console.error('Erreur chargement liens:', error);
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // NE PAS AFFICHER LE HEADER SUR LA PAGE DE CONNEXION
  if (pathname === '/') return null;

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const adminUUIDs = ['52793bea-994a-4b50-b768-75427df4747b', 'a06b22ec-11f6-49a7-ab8a-13607ff2ac87'];
  const isAdmin = userType === 'employee' && userId && adminUUIDs.includes(userId);


  // Liens supplémentaires dynamiques
  const getDynamicLinks = () => {
    const links = [];

    // 1. Assemblée générale - tools/ag
    links.push({
      href: '/tools/ag',
      label: 'Assemblée générale',
      icon: UsersRound,
      condition: true
    });

    // 2. Groupe de travail
    if (groupeTravail && userType === 'employee') {
      links.push({
        href: `/tools/groupes-travail/${encodeURIComponent(groupeTravail)}`,
        label: `${groupeTravail}`,
        icon: Briefcase,
        condition: true
      });
    }

    // 3. Conseil de classe
    if (classeConseil) {
      // Pour les élèves et employees non-direction/non-educ
      if (userType === 'student' || (userType === 'employee' && userJob !== 'direction' && userJob !== 'educ')) {
        links.push({
          href: `/dashboard/conseil-de-la-classe/${encodeURIComponent(classeConseil)}`,
          label: `Conseil ${classeConseil}`,
          icon: School,
          condition: true
        });
      }
    }

    // 4. Panneau de gestion des conseils - Direction
    if (userType === 'employee' && userJob === 'direction') {
      links.push({
        href: '/dashboard/administration/conseils',
        label: 'Gestion conseils',
        icon: UserCog,
        condition: true
      });
    }

    // 5. Panneau de gestion des conseils multiples - Éducateur
    if (userType === 'employee' && userJob === 'educ') {
      links.push({
        href: '/dashboard/administration/conseils-multiples',
        label: 'Gestion conseils (multi)',
        icon: Users,
        condition: true
      });
    }

    return links;
  };

  const dynamicLinks = getDynamicLinks();

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
          <Link href="/dashboard/main" className="flex items-center gap-3 group flex-shrink-0">
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

          {/* Navigation Desktop - avec liens dynamiques */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-2xl">

            {/* Séparateur pour les liens dynamiques */}
            {dynamicLinks.length > 0 && (
              <span className={`w-px h-8 ${isScrolled ? 'bg-gray-200' : 'bg-white/20'}`}></span>
            )}

            {/* Liens dynamiques */}
            {dynamicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${
                  isScrolled
                    ? 'text-gray-700 hover:text-school-green-600 hover:bg-school-green-50'
                    : 'text-white hover:text-green-100 hover:bg-white/10'
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Droite : Admin, Aide, Profil */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
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
          <div className="md:hidden py-4 border-t border-white/20 max-h-[80vh] overflow-y-auto">
            <nav className="flex flex-col gap-1">

              {/* Séparateur */}
              {dynamicLinks.length > 0 && (
                <div className={`my-2 border-t ${isScrolled ? 'border-gray-200' : 'border-white/20'}`}></div>
              )}

              {/* Liens dynamiques */}
              {dynamicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isScrolled
                      ? 'text-gray-700 hover:bg-school-green-50'
                      : 'text-white hover:bg-white/10'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              ))}

              {/* Admin dans menu mobile */}
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

              {/* Aide dans menu mobile */}
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

              {/* Profil dans menu mobile */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mt-2 ${
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

              {/* Déconnexion dans menu mobile */}
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