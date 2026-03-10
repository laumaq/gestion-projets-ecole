// hooks/useUser.ts
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  type: 'employee' | 'student';
  role?: string; // pour les employés: prof, educ, direction, administration
  job?: string;
  classe?: string; // pour les élèves
  niveau?: string; // pour les élèves
}

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer les infos utilisateur du localStorage
    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userPrenom = localStorage.getItem('userPrenom');
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    const userJob = localStorage.getItem('userJob');
    const userClass = localStorage.getItem('userClass');
    const userLevel = localStorage.getItem('userLevel');

    if (userType && userId && userName) {
      setUser({
        id: userId,
        nom: userName,
        prenom: userPrenom || '',
        email: userEmail || undefined,
        type: userType as 'employee' | 'student',
        role: userRole || undefined,
        job: userJob || undefined,
        classe: userClass || undefined,
        niveau: userLevel || undefined
      });
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.clear();
    setUser(null);
    router.push('/');
  };

  return {
    user,
    loading,
    logout,
    isEmployee: user?.type === 'employee',
    isStudent: user?.type === 'student',
    isDirection: user?.role === 'direction' || user?.job === 'direction',
    isProf: user?.job === 'prof',
    isEduc: user?.job === 'educ'
  };
}