// /components/conseilLutte/VueGlobale.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DetailGroupe from './DetailGroupe';

interface Props {
  phaseId: string;
  userType: 'employee' | 'student';
  userId: string;
}

export default function VueGlobale({ phaseId, userId }: Props) {
  const [groupes, setGroupes] = useState<any[]>([]);
  const [groupeSelectionneId, setGroupeSelectionneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!groupeSelectionneId) loadGroupes(); }, [phaseId, groupeSelectionneId]);

  const loadGroupes = async () => {
    setLoading(true);
    const { data: gr } = await supabase
      .from('conseil_lutte_groupes')
      .select(`id, nom, localisation_id, capacite_max, localisation_fixe (id, etage)`)
      .eq('phase_id', phaseId)
      .order('nom');

    const ids = (gr || []).map(g => g.id);
    const counts: Record<string, { eleves: number; employes: number }> = {};
    ids.forEach(id => { counts[id] = { eleves: 0, employes: 0 }; });

    if (ids.length > 0) {
      const { data: mbs } = await supabase
        .from('conseil_lutte_membres')
        .select('groupe_id, participant_type')
        .in('groupe_id', ids);
      (mbs || []).forEach(m => {
        if (m.participant_type === 'student') counts[m.groupe_id].eleves++;
        else counts[m.groupe_id].employes++;
      });
    }

    setGroupes((gr || []).map(g => ({
      ...g,
      elevesCount: counts[g.id].eleves,
      employesCount: counts[g.id].employes,
    })));
    setLoading(false);
  };

  if (groupeSelectionneId) {
    return <DetailGroupe groupeId={groupeSelectionneId} onBack={() => setGroupeSelectionneId(null)} userId={userId} />;
  }

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Groupes de la phase ({groupes.length})</h2>
      <p className="text-sm text-gray-500 mb-4">Cliquez sur un groupe pour consulter ses membres et prendre les présences.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {groupes.map(g => (
          <button
            key={g.id}
            onClick={() => setGroupeSelectionneId(g.id)}
            className="text-left border rounded-lg p-4 hover:shadow-md transition bg-white hover:border-red-300"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-gray-900">{g.nom}</div>
                <div className="text-xs text-gray-500">
                  Local {g.localisation_fixe?.id || g.localisation_id || '—'}
                  {g.localisation_fixe?.etage && ` • Étage ${g.localisation_fixe.etage}`}
                </div>
              </div>
              <div className="text-red-600">→</div>
            </div>
            <div className="flex gap-3 text-xs text-gray-600 mt-3 pt-3 border-t">
              <span>👤 {g.elevesCount}{g.capacite_max ? `/${g.capacite_max}` : ''}</span>
              <span>👨‍🏫 {g.employesCount}</span>
            </div>
          </button>
        ))}
      </div>
      {groupes.length === 0 && (
        <div className="text-center py-12 text-gray-500">Aucun groupe pour cette phase.</div>
      )}
    </div>
  );
}