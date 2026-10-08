// /components/conseilLutte/DetailGroupe.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  groupeId: string;
  onBack: () => void;
  userId: string;
}

export default function DetailGroupe({ groupeId, onBack, userId }: Props) {
  const [groupe, setGroupe] = useState<any>(null);
  const [membres, setMembres] = useState<any[]>([]);
  const [presences, setPresences] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtreClasse, setFiltreClasse] = useState<string>('all');

  useEffect(() => { loadData(); }, [groupeId]);

  const loadData = async () => {
    setLoading(true);
    const { data: g } = await supabase
      .from('conseil_lutte_groupes')
      .select(`*, localisation_fixe (id, etage)`)
      .eq('id', groupeId)
      .single();
    setGroupe(g);

    const { data: mb } = await supabase
      .from('conseil_lutte_membres')
      .select('participant_id, participant_type')
      .eq('groupe_id', groupeId);

    const elevesIds = (mb || []).filter(m => m.participant_type === 'student').map(m => parseInt(m.participant_id));
    const employesIds = (mb || []).filter(m => m.participant_type === 'employee').map(m => m.participant_id);

    const [elevesRes, employesRes, presencesRes] = await Promise.all([
      elevesIds.length > 0 ? supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', elevesIds) : Promise.resolve({ data: [] }),
      employesIds.length > 0 ? supabase.from('employees').select('id, nom, prenom, job, initiale').in('id', employesIds) : Promise.resolve({ data: [] }),
      supabase.from('conseil_lutte_presences').select('student_matricule, present').eq('groupe_id', groupeId),
    ]);

    const eleves = (elevesRes.data || []).map((s: any) => ({
      id: s.matricule, type: 'student', nom: s.nom, prenom: s.prenom, classe: s.classe,
    })).sort((a, b) => a.classe !== b.classe ? a.classe.localeCompare(b.classe) : a.nom.localeCompare(b.nom));

    const employes = (employesRes.data || []).map((e: any) => ({
      id: e.id, type: 'employee', nom: e.nom, prenom: e.prenom,
      role: e.job === 'educ' ? 'Éducateur' : 'Prof',
    }));

    setMembres([...employes, ...eleves]);

    const presenceMap = new Map<number, boolean>();
    eleves.forEach((e: any) => presenceMap.set(e.id, false)); // absent par défaut
    (presencesRes.data || []).forEach(p => presenceMap.set(p.student_matricule, p.present));
    setPresences(presenceMap);
    setLoading(false);
  };

  const togglePresence = async (matricule: number) => {
    const nouvelle = !presences.get(matricule);
    const newMap = new Map(presences); newMap.set(matricule, nouvelle); setPresences(newMap);

    setSaving(true);
    const { error } = await supabase.from('conseil_lutte_presences').upsert({
      groupe_id: groupeId,
      student_matricule: matricule,
      present: nouvelle,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'groupe_id,student_matricule' });

    if (error) {
      const rollback = new Map(presences); rollback.set(matricule, !nouvelle); setPresences(rollback);
    }
    setSaving(false);
  };

  const bulkSet = async (present: boolean) => {
    const eleves = membres.filter(m => m.type === 'student');
    const label = present ? 'PRÉSENTS' : 'ABSENTS';
    if (!confirm(`Marquer les ${eleves.length} élèves comme ${label} ?`)) return;

    setSaving(true);
    const newMap = new Map(presences);
    eleves.forEach(e => newMap.set(e.id, present));
    setPresences(newMap);

    const upserts = eleves.map(e => ({
      groupe_id: groupeId,
      student_matricule: e.id,
      present,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('conseil_lutte_presences')
      .upsert(upserts, { onConflict: 'groupe_id,student_matricule' });
    if (error) await loadData();
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;
  if (!groupe) return null;

  const eleves = membres.filter(m => m.type === 'student');
  const employes = membres.filter(m => m.type === 'employee');
  const presentsCount = eleves.filter(e => presences.get(e.id)).length;
  const classes = [...new Set(eleves.map(e => e.classe).filter(Boolean))].sort();

  let elevesFiltres = eleves;
  if (filtreClasse !== 'all') elevesFiltres = elevesFiltres.filter(e => e.classe === filtreClasse);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    elevesFiltres = elevesFiltres.filter(e =>
      `${e.prenom} ${e.nom}`.toLowerCase().includes(q) || e.classe?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-600 hover:text-red-600">← Retour aux groupes</button>

      <div className="bg-white rounded-lg border-2 border-red-200 p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{groupe.nom}</h2>
            <p className="text-sm text-gray-600">
              Local {groupe.localisation_fixe?.id || groupe.localisation_id || '—'}
              {groupe.localisation_fixe?.etage && ` • Étage ${groupe.localisation_fixe.etage}`}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold text-gray-900">{presentsCount}/{eleves.length} présents</div>
            <div className="text-xs text-gray-500">👨‍🏫 {employes.length} encadrant{employes.length > 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {employes.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-purple-900 mb-2">Encadrants</h3>
          <div className="flex flex-wrap gap-2">
            {employes.map(e => (
              <div key={e.id} className="bg-white border border-purple-200 rounded px-3 py-1.5 text-sm">
                👨‍🏫 {e.prenom} {e.nom} <span className="text-xs text-gray-500">({e.role})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h3 className="text-base font-semibold text-gray-900">Élèves ({eleves.length})</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => bulkSet(true)} disabled={saving}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              Tout présent
            </button>
            <button onClick={() => bulkSet(false)} disabled={saving}
              className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50">
              Tout absent
            </button>
            {classes.length > 0 && (
              <select value={filtreClasse} onChange={(e) => setFiltreClasse(e.target.value)}
                className="px-2 py-1 text-xs border rounded">
                <option value="all">Toutes les classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        <input
          type="text"
          placeholder="🔍 Rechercher un élève..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg mb-3 focus:ring-2 focus:ring-red-500"
        />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Élève</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Classe</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Présence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {elevesFiltres.map(e => {
                const present = presences.get(e.id) || false;
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{e.prenom} {e.nom}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{e.classe}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => togglePresence(e.id)}
                        disabled={saving}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                          present
                            ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                        }`}
                      >{present ? '✓' : '✕'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {elevesFiltres.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Aucun élève ne correspond au filtre.</div>
          )}
        </div>
      </div>
    </div>
  );
}