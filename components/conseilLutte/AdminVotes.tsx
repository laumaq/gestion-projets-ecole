// /components/conseilLutte/AdminVotes.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  config: any;
  phaseId?: string;
}

export default function AdminVotes({ config, phaseId }: Props) {
  const [lignes, setLignes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, number | ''>>({});

  useEffect(() => { load(); }, [phaseId]);

  const load = async () => {
    setLoading(true);
    const { data: phases } = await supabase
      .from('conseil_lutte_phases')
      .select('id, nom, ordre')
      .eq('config_id', config.id)
      .order('ordre');

    let phasesFiltrees = phases || [];
    if (phaseId) phasesFiltrees = phasesFiltrees.filter(p => p.id === phaseId);
    if (phasesFiltrees.length === 0) { setLignes([]); setLoading(false); return; }

    const tous: any[] = [];
    for (const ph of phasesFiltrees) {
      const { data: groupes } = await supabase
        .from('conseil_lutte_groupes')
        .select(`id, nom, vote_pour, localisation_fixe (id, etage)`)
        .eq('phase_id', ph.id);

      const groupeIds = (groupes || []).map(g => g.id);

      // Récupérer les présents par groupe (via conseil_lutte_presences)
      let presMap: Record<string, number> = {};
      if (groupeIds.length > 0) {
        const { data: pres } = await supabase
          .from('conseil_lutte_presences')
          .select('groupe_id, present')
          .in('groupe_id', groupeIds);
        (pres || []).forEach(p => {
          if (p.present) {
            presMap[p.groupe_id] = (presMap[p.groupe_id] || 0) + 1;
          }
        });
      }

      (groupes || []).forEach(g => tous.push({
        ...g,
        phase_nom: ph.nom,
        presences_count: presMap[g.id] || 0,
      }));
    }

    // Tri par étage puis local
    const ORDRE_ETAGES: Record<string, number> = {
      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, 'Annexe': 7,
    };
    tous.sort((a, b) => {
      const la = Array.isArray(a.localisation_fixe) ? a.localisation_fixe[0] : a.localisation_fixe;
      const lb = Array.isArray(b.localisation_fixe) ? b.localisation_fixe[0] : b.localisation_fixe;
      const ea = la ? (ORDRE_ETAGES[String(la.etage)] ?? 99) : 99;
      const eb = lb ? (ORDRE_ETAGES[String(lb.etage)] ?? 99) : 99;
      if (ea !== eb) return ea - eb;
      return String(la?.id || '').localeCompare(String(lb?.id || ''), undefined, { numeric: true });
    });

    const init: Record<string, number | ''> = {};
    tous.forEach(g => { init[g.id] = g.vote_pour ?? ''; });
    setEdits(init);
    setLignes(tous);
    setLoading(false);
  };

  const setChamp = (groupeId: string, valeur: string) => {
    setEdits(prev => ({
      ...prev,
      [groupeId]: valeur === '' ? '' : Math.max(0, parseInt(valeur) || 0),
    }));
  };

  const enregistrer = async (ligne: any) => {
    const edit = edits[ligne.id];
    const pour = edit === '' ? null : edit;

    if (pour != null && pour > ligne.presences_count) {
      if (!confirm(
        `Le nombre de voix pour (${pour}) dépasse le nombre de présents (${ligne.presences_count}).\n\n` +
        `Confirmer quand même ?`
      )) return;
    }

    setSaving(ligne.id);
    const { error } = await supabase
      .from('conseil_lutte_groupes')
      .update({ vote_pour: pour })
      .eq('id', ligne.id);
    setSaving(null);
    if (error) { alert('Erreur : ' + error.message); return; }
    setLignes(prev => prev.map(l => l.id === ligne.id ? { ...l, vote_pour: pour } : l));
  };

  const vider = async (groupeId: string) => {
    if (!confirm('Effacer le vote de ce groupe ?')) return;
    setSaving(groupeId);
    await supabase
      .from('conseil_lutte_groupes')
      .update({ vote_pour: null })
      .eq('id', groupeId);
    setSaving(null);
    setEdits(prev => ({ ...prev, [groupeId]: '' }));
    setLignes(prev => prev.map(l => l.id === groupeId ? { ...l, vote_pour: null } : l));
  };

  if (loading) return <div className="text-center py-8">Chargement…</div>;
  if (lignes.length === 0) return <div className="text-center py-8 text-gray-500">Aucun groupe.</div>;

  const totalPour = lignes.reduce((s, l) => s + (l.vote_pour || 0), 0);
  const totalVotants = lignes.reduce((s, l) => s + l.presences_count, 0);
  const totalContre = totalVotants - totalPour;
  const groupesAyantVote = lignes.filter(l => l.vote_pour != null).length;

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Résultats des votes</h3>
            <p className="text-xs text-gray-500">
              {groupesAyantVote}/{lignes.length} groupes ont voté ·{' '}
              <strong className="text-gray-900">{totalPour} pour</strong>
              {' · '}
              <strong className="text-gray-900">{totalContre} contre</strong>
              {' · '}
              <strong className="text-gray-900">{totalVotants} votants</strong>
            </p>
          </div>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700">
            ⟳ Rafraîchir
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Groupe</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Local</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">Pour</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">Votants</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">Contre</th>
                <th className="px-3 py-2 w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lignes.map(l => {
                const lf = Array.isArray(l.localisation_fixe) ? l.localisation_fixe[0] : l.localisation_fixe;
                const edit = edits[l.id] ?? '';
                const contre = (typeof edit === 'number')
                  ? l.presences_count - edit
                  : null;
                const estSaving = saving === l.id;
                const modifie = (edit === '' ? null : edit) !== l.vote_pour;

                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">
                      {l.nom}
                      <span className="text-xs text-gray-400 ml-2">({l.phase_nom})</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {lf?.id || '—'}{lf?.etage && ` (É${lf.etage})`}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number" min={0}
                        value={edit}
                        onChange={e => setChamp(l.id, e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm text-center"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-gray-700">
                      {l.presences_count}
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                      {contre != null ? contre : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => enregistrer(l)}
                          disabled={!modifie || estSaving}
                          className={`px-2 py-1 text-xs rounded disabled:opacity-40 ${
                            modifie ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {estSaving ? '…' : 'Enregistrer'}
                        </button>
                        {l.vote_pour != null && (
                          <button
                            onClick={() => vider(l.id)}
                            disabled={estSaving}
                            className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-40"
                            title="Effacer le vote"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}