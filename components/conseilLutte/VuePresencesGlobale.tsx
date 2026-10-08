// /components\conseilLutte\VuePresencesGlobale.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  groupes: any[];
  userId: string;
}

export default function VuePresencesGlobale({ groupes, userId }: Props) {
  const [membresParGroupe, setMembresParGroupe] = useState<Record<string, any[]>>({});
  const [presences, setPresences] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtreClasse, setFiltreClasse] = useState<string>('all');

  useEffect(() => { loadAll(); }, [groupes.map(g => g.id).join(',')]);

  const loadAll = async () => {
    setLoading(true);
    const ids = groupes.map(g => g.id);
    if (ids.length === 0) { setLoading(false); return; }

    const { data: mbs } = await supabase
      .from('conseil_lutte_membres')
      .select('groupe_id, participant_id, participant_type')
      .in('groupe_id', ids);

    const elevesIds: number[] = [];
    const employesIds: string[] = [];
    (mbs || []).forEach(m => {
      if (m.participant_type === 'student') elevesIds.push(parseInt(m.participant_id));
      else employesIds.push(m.participant_id);
    });

    const [eRes, pRes] = await Promise.all([
      elevesIds.length > 0
        ? supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', elevesIds)
        : Promise.resolve({ data: [] as any[] }),
      employesIds.length > 0
        ? supabase.from('employees').select('id, nom, prenom, job').in('id', employesIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const elevesMap: Record<number, any> = {};
    (eRes.data || []).forEach((s: any) => elevesMap[s.matricule] = s);
    const profsMap: Record<string, any> = {};
    (pRes.data || []).forEach((p: any) => profsMap[p.id] = p);

    const parGroupe: Record<string, any[]> = {};
    groupes.forEach(g => parGroupe[g.id] = []);
    (mbs || []).forEach(m => {
      if (!parGroupe[m.groupe_id]) return;
      if (m.participant_type === 'student') {
        const s = elevesMap[parseInt(m.participant_id)];
        if (s) parGroupe[m.groupe_id].push({
          id: parseInt(m.participant_id), type: 'student',
          nom: s.nom, prenom: s.prenom, classe: s.classe,
        });
      } else {
        const p = profsMap[m.participant_id];
        if (p) parGroupe[m.groupe_id].push({
          id: m.participant_id, type: 'employee',
          nom: p.nom, prenom: p.prenom,
          role: p.job === 'educ' ? 'Éducateur' : 'Prof',
        });
      }
    });
    Object.keys(parGroupe).forEach(gid => {
      parGroupe[gid].sort((a, b) => {
        if (a.type === 'employee' && b.type !== 'employee') return -1;
        if (a.type !== 'employee' && b.type === 'employee') return 1;
        if (a.type === 'student' && b.type === 'student' && a.classe !== b.classe) {
          return (a.classe || '').localeCompare(b.classe || '');
        }
        return (a.nom || '').localeCompare(b.nom || '');
      });
    });
    setMembresParGroupe(parGroupe);

    const { data: pres } = await supabase
      .from('conseil_lutte_presences')
      .select('groupe_id, student_matricule, present')
      .in('groupe_id', ids);

    const map = new Map<string, boolean>();
    Object.entries(parGroupe).forEach(([gid, membres]) => {
      membres.forEach(m => {
        if (m.type === 'student') map.set(`${gid}_${m.id}`, false);
      });
    });
    (pres || []).forEach(p => map.set(`${p.groupe_id}_${p.student_matricule}`, p.present));
    setPresences(map);

    setLoading(false);
  };

  const toggle = async (groupeId: string, matricule: number) => {
    const key = `${groupeId}_${matricule}`;
    const nouvelle = !presences.get(key);
    const newMap = new Map(presences); newMap.set(key, nouvelle); setPresences(newMap);

    setSaving(true);
    const { error } = await supabase.from('conseil_lutte_presences').upsert({
      groupe_id: groupeId, student_matricule: matricule, present: nouvelle,
      updated_by: userId, updated_at: new Date().toISOString(),
    }, { onConflict: 'groupe_id,student_matricule' });
    if (error) {
      const rollback = new Map(presences); rollback.set(key, !nouvelle); setPresences(rollback);
    }
    setSaving(false);
  };

  const bulkGroupe = async (groupeId: string, present: boolean) => {
    const eleves = (membresParGroupe[groupeId] || []).filter(m => m.type === 'student');
    if (eleves.length === 0) return;
    if (!confirm(`Marquer les ${eleves.length} élèves de ce groupe comme ${present ? 'PRÉSENTS' : 'ABSENTS'} ?`)) return;

    setSaving(true);
    const newMap = new Map(presences);
    eleves.forEach(e => newMap.set(`${groupeId}_${e.id}`, present));
    setPresences(newMap);

    const upserts = eleves.map(e => ({
      groupe_id: groupeId, student_matricule: e.id, present,
      updated_by: userId, updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('conseil_lutte_presences')
      .upsert(upserts, { onConflict: 'groupe_id,student_matricule' });
    if (error) await loadAll();
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8">Chargement des présences…</div>;

  const toutesClasses = [...new Set(
    Object.values(membresParGroupe).flat()
      .filter(m => m.type === 'student' && m.classe)
      .map(m => m.classe)
  )].sort();

  return (
    <div className="space-y-3">
      {toutesClasses.length > 0 && (
        <div className="flex items-center gap-2 bg-white border rounded-lg p-3">
          <span className="text-sm text-gray-600">Filtrer par classe :</span>
          <select value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}
            className="px-2 py-1 border rounded text-sm">
            <option value="all">Toutes</option>
            {toutesClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {groupes.map(g => {
        const l = Array.isArray(g.localisation_fixe) ? g.localisation_fixe[0] : g.localisation_fixe;
        const membres = membresParGroupe[g.id] || [];
        const employes = membres.filter(m => m.type === 'employee');
        const elevesTous = membres.filter(m => m.type === 'student');
        const eleves = filtreClasse === 'all' ? elevesTous : elevesTous.filter(e => e.classe === filtreClasse);
        const presents = elevesTous.filter(e => presences.get(`${g.id}_${e.id}`)).length;

        return (
          <div key={g.id} className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b">
              <div>
                <div className="font-bold text-gray-900">
                  {g.nom}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    · Local {l?.id || g.localisation_id || '—'}{l?.etage && ` (É${l.etage})`}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  👨‍🏫 {employes.length} · 👤 {elevesTous.length} · ✓ {presents}/{elevesTous.length} présents
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => bulkGroupe(g.id, true)} disabled={saving}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                  Tout présent
                </button>
                <button onClick={() => bulkGroupe(g.id, false)} disabled={saving}
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                  Tout absent
                </button>
              </div>
            </div>

            {employes.length > 0 && (
              <div className="px-4 py-2 border-b bg-purple-50/40 flex flex-wrap gap-1">
                {employes.map(e => (
                  <span key={e.id} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    👨‍🏫 {e.prenom} {e.nom}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {eleves.map(e => {
                const present = presences.get(`${g.id}_${e.id}`) || false;
                return (
                  <button
                    key={e.id}
                    onClick={() => toggle(g.id, e.id)}
                    disabled={saving}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-left border-b border-r hover:bg-gray-50 transition ${
                      present ? 'bg-green-50/40' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm truncate">{e.prenom} {e.nom}</div>
                      <div className="text-xs text-gray-500">{e.classe}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      present
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}>{present ? '✓' : '✕'}</div>
                  </button>
                );
              })}
            </div>
            {eleves.length === 0 && (
              <div className="text-center py-3 text-xs text-gray-400">
                {filtreClasse === 'all' ? 'Aucun élève dans ce groupe.' : `Aucun élève de ${filtreClasse}.`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}