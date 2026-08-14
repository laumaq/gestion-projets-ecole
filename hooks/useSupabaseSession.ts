// hooks/useSupabaseSession.ts
import { useEffect } from 'react';
import { setCurrentUserId } from '@/lib/supabase';

export function useSupabaseSession() {
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setCurrentUserId(userId).catch(console.error);
    }
  }, []);
}