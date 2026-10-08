// /components/conseilLutte/AdminGroupes.tsx        

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  phaseId: string;
  groupes: any[];
  onRefresh: () => void;
  verrouille: boolean;
}

export default function AdminGroupes({ phaseId, groupes, onRefresh, verrouille }: Props) {
  const [locaux, setLocaux] = useState<any[]>([]);
  const [compteurs, setCompteurs] = useState<Record<string, { eleves: number; employes: number; manuels: number }>>({});

  useEffect(() => {
    loadLocaux();
    loadCompteurs();
  }, [groupes]);

  const loadLocaux = async () => {
    const { data } = await supabase.from('localisation_fixe').select('id, etage').order('id');
    setLocaux(data || []);
  };

  const loadCompteurs = async () => {
    const ids = groupes.map(g => g.id);
    if (ids.length === 0) return;
    const { data } = await supabase
      .from('conseil_lutte_membres')
      .select('groupe_id, participant_type, manuel')
      .in('groupe_id', ids);

    const c: Record<string, any> = {};
    ids.forEach(id => c[id] = { eleves: 0, employes: 0, manuels: 0 });
    (data || []).forEach(m => {
      if (m.participant_type === 'student') c[m.groupe_id].eleves++;
      else c[m.groupe_id].employes++;
      if (m.manuel) c[m.groupe_id].manuels++;
    });
    setCompteurs(c);
  };

  const updateGroupe = async (id: string, patch: any) => {
    await supabase.from('conseil_lutte_groupes').update(patch).eq('id', id);
    onRefresh();
  };

  const getLocal = (g: any) => {
    const lf = g.localisation_fixe;
    return Array.isArray(lf) ? lf[0] ?? null : lf;
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nom</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Local</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Capacité</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Élèves</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Encadrants</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Manuels</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groupes.map(g => {
              const l = getLocal(g);
              const c = compteurs[g.id] || { eleves: 0, employes: 0, manuels: 0 };
              return (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      defaultValue={g.nom}
                      disabled={verrouille}
                      onBlur={(e) => e.target.value !== g.nom && updateGroupe(g.id, { nom: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm disabled:bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      defaultValue={g.localisation_id || ''}
                      disabled={verrouille}
                      onChange={(e) => updateGroupe(g.id, { localisation_id: e.target.value || null })}
                      className="px-2 py-1 border rounded text-sm disabled:bg-gray-50"
                    >
                      <option value="">—</option>
                      {locaux.map(lo => (
                        <option key={lo.id} value={lo.id}>{lo.id} (É{lo.etage})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      defaultValue={g.capacite_max ?? ''}
                      disabled={verrouille}
                      onBlur={(e) => {
                        const v = e.target.value ? parseInt(e.target.value) : null;
                        if (v !== g.capacite_max) updateGroupe(g.id, { capacite_max: v });
                      }}
                      placeholder="—"
                      className="w-20 px-2 py-1 border rounded text-sm disabled:bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-sm">{c.eleves}</td>
                  <td className="px-3 py-2 text-center text-sm">{c.employes}</td>
                  <td className="px-3 py-2 text-center text-sm text-purple-700">{c.manuels}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}