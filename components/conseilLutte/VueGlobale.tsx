// /components/conseilLutte/VueGlobale.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DetailGroupe from './DetailGroupe';
import VuePresencesGlobale from './VuePresencesGlobale';
import ChoisirGroupe from './ChoisirGroupe';

const ORDRE_ETAGES: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '6': 6, 'Annexe': 7,
};

function extraireLocal(g: any) {
  const lf = g.localisation_fixe;
  return Array.isArray(lf) ? lf[0] ?? null : lf;
}

function trierParLocal(groupes: any[]) {
  return [...groupes].sort((a, b) => {
    const la = extraireLocal(a);
    const lb = extraireLocal(b);
    const ea = la ? ORDRE_ETAGES[la.etage] ?? 99 : 99;
    const eb = lb ? ORDRE_ETAGES[lb.etage] ?? 99 : 99;
    if (ea !== eb) return ea - eb;
    const ida = la?.id || '';
    const idb = lb?.id || '';
    return ida.localeCompare(idb, undefined, { numeric: true });
  });
}

interface Props {
  phaseId: string;
  phase?: any;
  userType: 'employee' | 'student';
  userId: string;
}

export default function VueGlobale({ phaseId, phase, userType, userId }: Props) {
  const [groupes, setGroupes] = useState<any[]>([]);
  const [groupeSelectionneId, setGroupeSelectionneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vue, setVue] = useState<'cartes' | 'presences'>('cartes');
  const [monGroupeId, setMonGroupeId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { if (!groupeSelectionneId) loadGroupes(); }, [phaseId, groupeSelectionneId, tick]);

  const loadGroupes = async () => {
    setLoading(true);
    const { data: gr } = await supabase
      .from('conseil_lutte_groupes')
      .select(`id, nom, localisation_id, capacite_max, localisation_fixe (id, etage)`)
      .eq('phase_id', phaseId);

    const ids = (gr || []).map(g => g.id);
    const counts: Record<string, { eleves: number; employes: number }> = {};
    ids.forEach(id => { counts[id] = { eleves: 0, employes: 0 }; });

    if (ids.length > 0) {
      const { data: mbs } = await supabase
        .from('conseil_lutte_membres')
        .select('groupe_id, participant_type, participant_id')
        .in('groupe_id', ids);
      (mbs || []).forEach(m => {
        if (m.participant_type === 'student') counts[m.groupe_id].eleves++;
        else counts[m.groupe_id].employes++;
        if (m.participant_type === 'employee' && m.participant_id === userId) {
          setMonGroupeId(m.groupe_id);
        }
      });
    }

    setGroupes(trierParLocal((gr || []).map(g => ({
      ...g,
      elevesCount: counts[g.id].eleves,
      employesCount: counts[g.id].employes,
    }))));
    setLoading(false);
  };

  if (groupeSelectionneId) {
    return <DetailGroupe groupeId={groupeSelectionneId} onBack={() => setGroupeSelectionneId(null)} userId={userId} />;
  }

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="space-y-4">

      {/* Bandeau pour employés non inscrits */}
      {userType === 'employee' && !monGroupeId && (
        <ChoisirGroupe
          phaseId={phaseId}
          phase={phase}
          userType={userType}
          userId={userId}
          onJoined={() => setTick(t => t + 1)}
        />
      )}

      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">
            Groupes de la phase ({groupes.length})
          </h2>
          <p className="text-sm text-gray-500">
            {vue === 'cartes'
              ? 'Cliquez sur un groupe pour voir le détail et prendre les présences.'
              : 'Vue combinée : tous les groupes et leurs présences sur une seule page.'}
          </p>
        </div>
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setVue('cartes')}
            className={`px-3 py-1.5 text-sm ${
              vue === 'cartes'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >Cartes</button>
          <button
            onClick={() => setVue('presences')}
            className={`px-3 py-1.5 text-sm ${
              vue === 'presences'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >Vue présences</button>
        </div>
      </div>

      {vue === 'presences' ? (
        <VuePresencesGlobale groupes={groupes} userId={userId} />
      ) : (
        <GroupesParEtage
          groupes={groupes}
          monGroupeId={monGroupeId}
          onSelect={setGroupeSelectionneId}
        />
      )}

      {groupes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun groupe pour cette phase.
        </div>
      )}
    </div>
  );
}

function GroupesParEtage({
  groupes,
  monGroupeId,
  onSelect,
}: {
  groupes: any[];
  monGroupeId: string | null;
  onSelect: (id: string) => void;
}) {
  // Regroupe par étage (en conservant l'ordre déjà trié)
  const parEtage: { etage: string; groupes: any[] }[] = [];
  for (const g of groupes) {
    const l = extraireLocal(g);
    const etage = l?.etage ? String(l.etage) : '—';
    let bloc = parEtage.find(b => b.etage === etage);
    if (!bloc) {
      bloc = { etage, groupes: [] };
      parEtage.push(bloc);
    }
    bloc.groupes.push(g);
  }

  const labelEtage = (e: string) => {
    if (e === 'Annexe') return 'Annexe';
    if (e === '—') return 'Sans local';
    return `Étage ${e}`;
  };

  return (
    <div className="space-y-6">
      {parEtage.map(bloc => (
        <div key={bloc.etage}>
          {/* Démarcation d'étage */}
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {labelEtage(bloc.etage)}
            </h3>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">
              {bloc.groupes.length} groupe{bloc.groupes.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bloc.groupes.map(g => {
              const l = extraireLocal(g);
              const isMonGroupe = g.id === monGroupeId;
              return (
                <button
                  key={g.id}
                  onClick={() => onSelect(g.id)}
                  className={`text-left border rounded-lg p-4 hover:shadow-md transition bg-white ${
                    isMonGroupe
                      ? 'border-red-400 ring-2 ring-red-200'
                      : 'hover:border-red-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-gray-900">
                        {g.nom}
                        {isMonGroupe && (
                          <span className="text-xs text-red-600 ml-1">· mon groupe</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Local {l?.id || g.localisation_id || '—'}
                      </div>
                    </div>
                    <div className="text-red-600">→</div>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600 mt-3 pt-3 border-t">
                    <span>👤 {g.elevesCount}{g.capacite_max ? `/${g.capacite_max}` : ''}</span>
                    <span>👨‍🏫 {g.employesCount}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}