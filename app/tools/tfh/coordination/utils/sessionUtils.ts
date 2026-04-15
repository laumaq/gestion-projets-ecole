// app/tools/tfh/coordination/utils/sessionUtils.ts

import { Eleve } from '../types';
import { supabase } from '@/lib/supabase';

export interface Journee {
  key: string;
  date: Date;
  nom: string;
}

export interface Session {
  id: string;
  nom: string;
  date_debut: Date;
  date_fin: Date;
  journees: string[];
}

export async function getJourneesFromSupabase(): Promise<Journee[]> {
  const { data, error } = await supabase
    .from('tfh_system_settings')
    .select('*')
    .like('setting_key', 'Journee_%')
    .not('setting_key', 'like', 'Journee_defense_%')
    .order('setting_key');

  if (error) {
    console.error('Erreur lors de la récupération des journées:', error);
    return [];
  }

  return data
    .filter((item: any) => item.setting_value && item.setting_value.trim() !== '')
    .map((item: any) => ({
      key: item.setting_key,
      date: new Date(item.setting_value),
      nom: item.description || item.setting_key.replace('_', ' ')
    }))
    .sort((a: Journee, b: Journee) => a.date.getTime() - b.date.getTime());
}

export function detecterSessions(journees: Journee[]): Session[] {
  if (journees.length === 0) return [];

  const sortedJournees = [...journees].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  const sessions: Session[] = [];
  let currentSession: Session | null = null;

  for (let i = 0; i < sortedJournees.length; i++) {
    const journee = sortedJournees[i];

    if (!currentSession) {
      currentSession = {
        id: `session_${sessions.length + 1}`,
        nom: `Session ${sessions.length + 1}`,
        date_debut: journee.date,
        date_fin: journee.date,
        journees: [journee.key]
      };
    } else {
      const joursDifference = Math.abs(
        (journee.date.getTime() - currentSession.date_fin.getTime()) / (1000 * 3600 * 24)
      );

      if (joursDifference <= 7) {
        currentSession.date_fin = journee.date;
        currentSession.journees.push(journee.key);
      } else {
        sessions.push(currentSession);
        currentSession = {
          id: `session_${sessions.length + 1}`,
          nom: `Session ${sessions.length + 1}`,
          date_debut: journee.date,
          date_fin: journee.date,
          journees: [journee.key]
        };
      }
    }
  }

  if (currentSession) {
    sessions.push(currentSession);
  }

  sessions.forEach((session, index) => {
    const mois = session.date_debut.toLocaleString('fr-FR', { month: 'long' });
    session.nom = `Session ${mois} ${session.date_debut.getFullYear()}`;
    
    if (index >= 20) {
      console.warn(`⚠️ Plus de 20 sessions détectées (${sessions.length} au total)`);
    }
  });

  return sessions;
}

export function estConvoque(eleve: Eleve, sessionIndex: number): boolean {
  const key = `session_${sessionIndex}_convoque` as keyof Eleve;
  const valeur = eleve[key] as string | undefined;
  return valeur?.startsWith('Oui') === true;
}

export function getPresenceJournee(eleve: Eleve, journeeIndex: number): boolean | null {
  const key = `journee_${journeeIndex}_present` as keyof Eleve;
  const valeur = eleve[key];
  if (valeur === true) return true;
  if (valeur === false) return false;
  return null;
}

export function getStatutSession(eleve: Eleve, session: Session): string {
  const sessionNum = parseInt(session.id.split('_')[1]);
  
  if (!estConvoque(eleve, sessionNum)) {
    return 'non-convoque';
  }

  const presences = session.journees.map(journeeKey => {
    const journeeIndex = parseInt(journeeKey.split('_')[1]);
    return getPresenceJournee(eleve, journeeIndex);
  });

  if (presences.every(p => p === null)) {
    return 'en-attente';
  }

  if (presences.every(p => p === true)) {
    return 'present';
  }

  if (presences.some(p => p === false)) {
    return 'absent';
  }

  return 'partiellement-present';
}

export function mettreAJourPresence(
  eleve: Eleve,
  journeeIndex: number,
  nouvelleValeur: boolean | null
): Eleve {
  const key = `journee_${journeeIndex}_present` as keyof Eleve;
  return {
    ...eleve,
    [key]: nouvelleValeur
  };
}

export function mettreAJourConvocation(
  eleve: Eleve,
  sessionIndex: number,
  nouvelleValeur: string
): Eleve {
  const key = `session_${sessionIndex}_convoque` as keyof Eleve;
  return {
    ...eleve,
    [key]: nouvelleValeur
  };
}