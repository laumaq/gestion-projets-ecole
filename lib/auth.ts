// Fonctions utilitaires pour l'authentification

export interface UserSession {
  userId: string;
  userName: string;
  userType: string;
  userRole?: string;
}

export const getCurrentUser = (): UserSession | null => {
  if (typeof window === 'undefined') return null;

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const userType = localStorage.getItem('userType');
  const userRole = localStorage.getItem('userRole');

  if (!userId || !userName || !userType) return null;

  return {
    userId,
    userName,
    userType,
    userRole: userRole || 'employee'
  };
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('userId');
};

export const logout = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userType');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userDirectionId');
  
  window.location.href = '/';
};
