// /components\conseilLutte\MonGroupe.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ChoisirGroupe from './ChoisirGroupe';

interface Props {
  phaseId: string;
  userType: 'employee' | 'student';
  userId: string;
}

export default function MonGroupe({ phaseId, userType, userId }: Props) {
  const [phase, setPhase] = useState<any>(null);
  const [groupe, setGroupe] = useState<any>(null);
  const [local, setLocal] = useState<any>(null);
  const [membres, setMembres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => { loadData(); }, [phaseId, userId, tick]);

  const loadData = async () => {
    setLoading(true);
    const { data: ph } = await supabase
      .from('conseil_lutte_phases')
      .select('*')
      .eq('id', phaseId)
      .single();
    setPhase(ph);

    const { data: membresData } = await supabase
      .from('conseil_lutte_membres')
      .select(`groupe_id, conseil_lutte_groupes!inner (
        id, nom, localisation_id, phase_id,
        localisation_fixe (id, etage)
      )`)
      .eq('participant_id', userId)
      .eq('participant_type', userType === 'student' ? 'student' : 'employee')
      .eq('conseil_lutte_groupes.phase_id', phaseId);

    // --- Normalisation locale (PostgREST renvoie parfois un array, TS suit) ---
    const rawGroupe = membresData?.[0]?.conseil_lutte_groupes as any;
    const groupeData: any = Array.isArray(rawGroupe) ? rawGroupe[0] ?? null : rawGroupe;

    if (!groupeData) {
      setGroupe(null);
      setLoading(false);
      return;
    }
    setGroupe(groupeData);

    const rawLocal = groupeData.localisation_fixe;
    const localData: any = Array.isArray(rawLocal) ? rawLocal[0] ?? null : rawLocal;
    setLocal(localData);
    // --- fin normalisation ---

    const { data: allMembres } = await supabase
      .from('conseil_lutte_membres')
      .select('participant_id, participant_type')
      .eq('groupe_id', groupeData.id);

    const elevesIds: number[] = [];
    const employesIds: string[] = [];
    (allMembres || []).forEach(m => {
      if (m.participant_type === 'student') elevesIds.push(parseInt(m.participant_id));
      else employesIds.push(m.participant_id);
    });

    const [elevesRes, employesRes] = await Promise.all([
      elevesIds.length > 0
        ? supabase.from('students').select('matricule, nom, prenom, classe, sexe').in('matricule', elevesIds)
        : Promise.resolve({ data: [] as any[] }),
      employesIds.length > 0
        ? supabase.from('employees').select('id, nom, prenom, job, initiale').in('id', employesIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const eleves = (elevesRes.data || []).map((s: any) => ({
      id: s.matricule.toString(),
      type: 'student',
      nom: s.nom,
      prenom: s.prenom,
      classe: s.classe,
    }));

    const employes = (employesRes.data || []).map((e: any) => ({
      id: e.id,
      type: 'employee',
      nom: e.nom,
      prenom: e.prenom,
      classe: e.job === 'educ' ? 'Éducateur' : 'Prof',
    }));

    const tous = [...employes, ...eleves].sort((a, b) => {
      if (a.type === 'employee' && b.type !== 'employee') return -1;
      if (a.type !== 'employee' && b.type === 'employee') return 1;
      if (a.type === 'student' && b.type === 'student' && a.classe !== b.classe) {
        return a.classe.localeCompare(b.classe);
      }
      return a.nom.localeCompare(b.nom);
    });
    setMembres(tous);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  if (!groupe) {
    return (
      <ChoisirGroupe
        phaseId={phaseId}
        phase={phase}
        userType={userType}
        userId={userId}
        onJoined={() => setTick(t => t + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border-2 border-red-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase text-red-600 font-semibold tracking-wide mb-1">Votre groupe</div>
            <h2 className="text-2xl font-bold text-gray-900">{groupe.nom}</h2>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-gray-500 font-semibold">Local</div>
            <div className="text-2xl font-bold text-gray-900">{local?.id || groupe.localisation_id || '—'}</div>
            {local?.etage && <div className="text-xs text-gray-500">Étage {local.etage}</div>}
          </div>
        </div>
        {phase && (
          <div className="text-sm text-gray-600 border-t pt-3">
            ⏰ {phase.heure_debut} – {phase.heure_fin} — {phase.nom}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Membres du groupe ({membres.length})</h3>
        <div className="space-y-2">
          {membres.map(m => {
            const isMe = m.id === userId &&
              ((userType === 'student' && m.type === 'student') ||
               (userType === 'employee' && m.type === 'employee'));
            return (
              <div
                key={`${m.type}-${m.id}`}
                className={`flex items-center justify-between p-2 rounded ${isMe ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{m.type === 'employee' ? '👨‍🏫' : '👤'}</span>
                  <span className={`text-sm ${isMe ? 'font-semibold' : ''}`}>
                    {m.prenom} {m.nom}{isMe && ' (moi)'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {m.type === 'employee' ? m.classe : `Classe ${m.classe}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}