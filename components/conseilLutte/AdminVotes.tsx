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
  const [edits, setEdits] = useState<Record<string, { pour: number | ''; total: number | '' }>>({});

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
        .select(`id, nom, vote_pour, vote_total, localisation_fixe (id, etage)`)
        .eq('phase_id', ph.id);
      (groupes || []).forEach(g => tous.push({ ...g, phase_nom: ph.nom }));
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

    // Init des champs d'édition
    const init: Record<string, { pour: number | ''; total: number | '' }> = {};
    tous.forEach(g => {
      init[g.id] = {
        pour: g.vote_pour ?? '',
        total: g.vote_total ?? '',
      };
    });
    setEdits(init);
    setLignes(tous);
    setLoading(false);
  };

  const setChamp = (groupeId: string, champ: 'pour' | 'total', valeur: string) => {
    setEdits(prev => ({
      ...prev,
      [groupeId]: {
        ...prev[groupeId],
        [champ]: valeur === '' ? '' : Math.max(0, parseInt(valeur) || 0),
      },
    }));
  };

  const enregistrer = async (groupeId: string) => {
    const edit = edits[groupeId];
    if (!edit) return;
    const pour = edit.pour === '' ? null : edit.pour;
    const total = edit.total === '' ? null : edit.total;

    if (pour != null && total != null && pour > total) {
      alert('Le nombre de voix pour ne peut pas dépasser le nombre total.');
      return;
    }

    setSaving(groupeId);
    const { error } = await supabase
      .from('conseil_lutte_groupes')
      .update({
        vote_pour: pour,
        vote_total: total,
      })
      .eq('id', groupeId);
    setSaving(null);
    if (error) {
      alert('Erreur : ' + error.message);
      return;
    }
    // MAJ local
    setLignes(prev => prev.map(l => l.id === groupeId ? { ...l, vote_pour: pour, vote_total: total } : l));
  };

  const vider = async (groupeId: string) => {
    if (!confirm('Effacer le vote de ce groupe ?')) return;
    setSaving(groupeId);
    await supabase
      .from('conseil_lutte_groupes')
      .update({ vote_pour: null, vote_total: null })
      .eq('id', groupeId);
    setSaving(null);
    setEdits(prev => ({ ...prev, [groupeId]: { pour: '', total: '' } }));
    setLignes(prev => prev.map(l => l.id === groupeId ? { ...l, vote_pour: null, vote_total: null } : l));
  };

  if (loading) return <div className="text-center py-8">Chargement…</div>;

  if (lignes.length === 0) {
    return <div className="text-center py-8 text-gray-500">Aucun groupe.</div>;
  }

  const totalPour = lignes.reduce((s, l) => s + (l.vote_pour || 0), 0);
  const totalVotants = lignes.reduce((s, l) => s + (l.vote_total || 0), 0);
  const totalContre = totalVotants - totalPour;
  const groupesAyantVote = lignes.filter(l => l.vote_total != null).length;

  return (
    <div className="space-y-3">
      {/* Entête agrégée */}
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

      {/* Tableau */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Groupe</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Local</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">Pour</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">Total</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">Contre</th>
                <th className="px-3 py-2 w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lignes.map(l => {
                const lf = Array.isArray(l.localisation_fixe) ? l.localisation_fixe[0] : l.localisation_fixe;
                const edit = edits[l.id] || { pour: '', total: '' };
                const contre = (typeof edit.pour === 'number' && typeof edit.total === 'number')
                  ? edit.total - edit.pour
                  : null;
                const estSaving = saving === l.id;
                const aEteModifie =
                  (edit.pour === '' ? null : edit.pour) !== l.vote_pour ||
                  (edit.total === '' ? null : edit.total) !== l.vote_total;

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
                        value={edit.pour}
                        onChange={e => setChamp(l.id, 'pour', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm text-center"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number" min={0}
                        value={edit.total}
                        onChange={e => setChamp(l.id, 'total', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm text-center"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                      {contre != null ? contre : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => enregistrer(l.id)}
                          disabled={!aEteModifie || estSaving}
                          className={`px-2 py-1 text-xs rounded disabled:opacity-40 ${
                            aEteModifie
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {estSaving ? '…' : 'Enregistrer'}
                        </button>
                        {l.vote_total != null && (
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