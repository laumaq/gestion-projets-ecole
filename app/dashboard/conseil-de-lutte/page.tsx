// /app/dashboard/conseil-de-lutte/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MonGroupe from '@/components/conseilLutte/MonGroupe';
import VueGlobale from '@/components/conseilLutte/VueGlobale';
import AdminPreparation from '@/components/conseilLutte/AdminPreparation';
import CreerConfig from '@/components/conseilLutte/CreerConfig';
import { estAdminConseilLutte } from '@/components/conseilLutte/admins';

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

function determinePhaseActive(phases: any[]) {
  const now = new Date();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  const parseHM = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const enCours = phases.find(p => hhmm >= parseHM(p.heure_debut) && hhmm <= parseHM(p.heure_fin));
  if (enCours) return enCours;
  return phases.find(p => hhmm < parseHM(p.heure_debut)) || phases[phases.length - 1] || null;
}

export default function ConseilDeLuttePage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'employee' | 'student' | null>(null);
  const [userId, setUserId] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [phaseActiveId, setPhaseActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'participant' | 'admin'>('participant');

  useEffect(() => {
    const type = localStorage.getItem('userType') as 'employee' | 'student' | null;
    const id = localStorage.getItem('userId');
    if (!type || !id) { router.push('/'); return; }
    setUserType(type);
    setUserId(id);
    loadAll(type, id);
  }, []);

    const loadAll = async (type: string, id: string) => {
    setLoading(true);
    const isAdminUser = type === 'employee' && estAdminConseilLutte(id);
    const today = todayLocal();

    // 1) Chercher d'abord la config AUJOURD'HUI
    // 2) Sinon, pour un admin : la prochaine config à venir
    let cfg: any = null;

    const { data: todayCfg } = await supabase
        .from('conseil_lutte_configs')
        .select('*')
        .eq('date_evenement', today)
        .maybeSingle();

    if (todayCfg) {
        cfg = todayCfg;
    } else if (isAdminUser) {
        // Prochaine config future (la plus proche dans le temps)
        const { data: futureCfg } = await supabase
        .from('conseil_lutte_configs')
        .select('*')
        .gte('date_evenement', today)
        .order('date_evenement', { ascending: true })
        .limit(1)
        .maybeSingle();
        cfg = futureCfg;
    }

    if (!cfg) {
        if (!isAdminUser) { router.push('/dashboard/main'); return; }
        setConfig(null);
        setPhases([]);
        setPhaseActiveId(null);
        setLoading(false);
        return;
    }

    setConfig(cfg);

    // Accès : admin toujours OK ; sinon il faut que la redirection soit active pour AUJOURD'HUI
    const estAujourdHui = cfg.date_evenement === today;
    const accesAutorise =
        isAdminUser ||
        (estAujourdHui && cfg.redirection_active === true) ||
        (estAujourdHui && cfg.ouverte_inscriptions === true);

    if (!accesAutorise) { router.push('/dashboard/main'); return; }

    const { data: ph } = await supabase
        .from('conseil_lutte_phases')
        .select('*')
        .eq('config_id', cfg.id)
        .order('ordre');

    setPhases(ph || []);
    const active = determinePhaseActive(ph || []);
    setPhaseActiveId(active?.id || null);
    setLoading(false);
    };

  if (loading || !userType) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  const isAdmin = userType === 'employee' && estAdminConseilLutte(userId);

  // Cas particulier : admin sans config → écran de création
  if (!config) {
    if (!isAdmin) return null;
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">✊ Conseil de lutte — Config initiale</h1>
          <p className="text-sm text-red-100">Aucune config pour aujourd'hui. Créez-en une.</p>
        </div>
        <CreerConfig onCreated={() => loadAll(userType, userId)} />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1">✊ Conseil de lutte</h1>
            <p className="text-sm text-red-100">
              {config.nom} — {new Date(config.date_evenement).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            {config.intro && <p className="mt-2 text-sm text-red-50 max-w-3xl">{config.intro}</p>}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode('participant')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  mode === 'participant'
                    ? 'bg-white text-red-700 font-semibold'
                    : 'bg-red-500/40 text-white hover:bg-red-500/60'
                }`}
              >Ma vue</button>
              <button
                onClick={() => setMode('admin')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  mode === 'admin'
                    ? 'bg-white text-red-700 font-semibold'
                    : 'bg-red-500/40 text-white hover:bg-red-500/60'
                }`}
              >Admin</button>
            </div>
          )}
        </div>
      </div>

      {phases.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {phases.map(p => (
            <button
              key={p.id}
              onClick={() => setPhaseActiveId(p.id)}
              className={`px-4 py-2 rounded-lg border-2 text-sm transition ${
                phaseActiveId === p.id
                  ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
              }`}
            >
              <div className="font-medium">{p.nom}</div>
              <div className="text-xs opacity-75">{p.heure_debut} – {p.heure_fin}</div>
            </button>
          ))}
        </div>
      )}

      {mode === 'admin' && isAdmin ? (
        <AdminPreparation
          config={config}
          phases={phases}
          phaseActiveId={phaseActiveId}
          onPhaseChange={setPhaseActiveId}
          onRefresh={() => loadAll(userType, userId)}
        />
      ) : phaseActiveId ? (
        userType === 'student' ? (
          <MonGroupe phaseId={phaseActiveId} userType={userType} userId={userId} />
        ) : (
          <VueGlobale phaseId={phaseActiveId} userType={userType} userId={userId} />
        )
      ) : (
        <div className="text-center py-12 text-gray-500">Aucune phase configurée.</div>
      )}
    </main>
  );
}