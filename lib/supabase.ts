// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Récupérez ces valeurs depuis votre projet Supabase
// Allez sur: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validation des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Variables Supabase non configurées. ' +
    'Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies dans .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

/**
 * Définit l'ID de l'utilisateur courant dans la session PostgreSQL
 * pour les politiques RLS qui utilisent app.current_user_id
 * 
 * @param userId - L'ID de l'utilisateur (UUID string)
 * @returns Promise avec le résultat de l'appel RPC
 * 
 * @example
 * // À utiliser avant chaque requête Supabase
 * await setCurrentUserId('52793bea-994a-4b50-b768-75427df4747b');
 * const { data } = await supabase.from('tfh_eleves').select('*');
 */
export async function setCurrentUserId(userId: string): Promise<void> {
  if (!userId) {
    console.warn('⚠️ setCurrentUserId: userId est vide');
    return;
  }
  
  try {
    // Appel de la fonction SQL set_app_user_id
    const { error } = await supabase.rpc('set_app_user_id', { user_id: userId });
    
    if (error) {
      console.error('❌ Erreur setCurrentUserId:', error);
      throw error;
    }
    
    console.log(`✅ setCurrentUserId: ${userId} défini dans la session PostgreSQL`);
  } catch (error) {
    console.error('❌ Erreur setCurrentUserId:', error);
    throw error;
  }
}

/**
 * Récupère l'ID de l'utilisateur courant depuis la session PostgreSQL
 * (utile pour le débogage)
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_app_user_id');
    
    if (error) {
      console.error('❌ Erreur getCurrentUserId:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erreur getCurrentUserId:', error);
    return null;
  }
}

/**
 * Fonction utilitaire pour wrapper une requête Supabase avec setCurrentUserId
 * 
 * @param userId - ID de l'utilisateur
 * @param callback - Fonction qui exécute la requête Supabase
 * @returns Le résultat de la requête
 */
export async function withCurrentUser<T>(
  userId: string,
  callback: () => Promise<T>
): Promise<T> {
  try {
    await setCurrentUserId(userId);
    return await callback();
  } catch (error) {
    console.error('❌ Erreur dans withCurrentUser:', error);
    throw error;
  }
}