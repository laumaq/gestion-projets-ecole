// /components/conseilLutte/AffectationManuelle.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  phaseId: string;
  groupes: any[];
  onRefresh: () => void;
  verrouille: boolean;
}

export default function AffectationManuelle({ phaseId, groupes, onRefresh, verrouille }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [resultats, setResultats] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectionGroupe, setSelectionGroupe] = useState<string>(groupes[0]?.id || '');
  const [membresParGroupe, setMembresParGroupe] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!selectionGroupe && groupes.length > 0) setSelectionGroupe(groupes[0].id);
  }, [groupes]);

  useEffect(() => {
    if (selectionGroupe) loadMembres(selectionGroupe);
  }, [selectionGroupe]);

  useEffect(() => {
    const t = setTimeout(() => { if (searchTerm.length >= 2) doSearch(); else setResultats([]); }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const doSearch = async () => {
    setSearching(true);
    const q = searchTerm.trim();
    const { data } = await supabase
      .from('students')
      .select('matricule, nom, prenom, classe, niveau')
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,classe.ilike.%${q}%`)
      .ilike('nom', `%${q}%`) // évite les "testeur" plus bas on filtre en JS
      .not('niveau', 'eq', '0')
      .limit(30);

    // Exclure Testeur explicitement
    const filtrés = (data || []).filter(s => !s.nom.toLowerCase().includes('testeur'));
    setResultats(filtrés);
    setSearching(false);
  };

  const loadMembres = async (groupeId: string) => {
    const { data: mb } = await supabase
      .from('conseil_lutte_membres')
      .select('id, participant_id, participant_type, manuel')
      .eq('groupe_id', groupeId);

    const elevesIds = (mb || []).filter(m => m.participant_type === 'student').map(m => parseInt(m.participant_id));
    const employesIds = (mb || []).filter(m => m.participant_type === 'employee').map(m => m.participant_id);

    const [eRes, pRes] = await Promise.all([
      elevesIds.length > 0 ? supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', elevesIds) : Promise.resolve({ data: [] as any[] }),
      employesIds.length > 0 ? supabase.from('employees').select('id, nom, prenom, job').in('id', employesIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const elevesMap: Record<string, any> = {};
    (eRes.data || []).forEach((s: any) => elevesMap[s.matricule] = s);
    const profsMap: Record<string, any> = {};
    (pRes.data || []).forEach((p: any) => profsMap[p.id] = p);

    const enriched = (mb || []).map(m => {
      if (m.participant_type === 'student') {
        const s = elevesMap[m.participant_id];
        return { ...m, nom: s?.nom, prenom: s?.prenom, classe: s?.classe, type: 'student' };
      } else {
        const p = profsMap[m.participant_id];
        return { ...m, nom: p?.nom, prenom: p?.prenom, classe: p?.job === 'educ' ? 'Éducateur' : 'Prof', type: 'employee' };
      }
    }).sort((a, b) => {
      if (a.type === 'employee' && b.type !== 'employee') return -1;
      if (a.type !== 'employee' && b.type === 'employee') return 1;
      return (a.nom || '').localeCompare(b.nom || '');
    });

    setMembresParGroupe(prev => ({ ...prev, [groupeId]: enriched }));
  };

  const assigner = async (student: any) => {
    if (verrouille) return;
    if (!selectionGroupe) { alert('Sélectionnez un groupe.'); return; }

    // Vérifie si déjà affecté dans cette phase
    const { data: existant } = await supabase
      .from('conseil_lutte_membres')
      .select(`id, groupe_id, conseil_lutte_groupes!inner(phase_id)`)
      .eq('participant_id', student.matricule.toString())
      .eq('participant_type', 'student')
      .eq('conseil_lutte_groupes.phase_id', phaseId);

    if (existant && existant.length > 0) {
      if (!confirm(`${student.prenom} ${student.nom} est déjà dans un groupe de cette phase. Déplacer ?`)) return;
      await supabase.from('conseil_lutte_membres').delete().in('id', existant.map(e => e.id));
    }

    await supabase.from('conseil_lutte_membres').insert({
      groupe_id: selectionGroupe,
      participant_id: student.matricule.toString(),
      participant_type: 'student',
      manuel: true,
    });

    await loadMembres(selectionGroupe);
    onRefresh();
  };

  const retirer = async (membreId: string) => {
    if (verrouille) return;
    if (!confirm('Retirer cette personne du groupe ?')) return;
    await supabase.from('conseil_lutte_membres').delete().eq('id', membreId);
    await loadMembres(selectionGroupe);
    onRefresh();
  };

  const toggleManuel = async (m: any) => {
    if (verrouille) return;
    await supabase.from('conseil_lutte_membres').update({ manuel: !m.manuel }).eq('id', m.id);
    await loadMembres(selectionGroupe);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Colonne gauche : recherche + résultats */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Rechercher un élève</h3>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nom, prénom ou classe…"
          className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
        />
        {searching && <div className="text-xs text-gray-400 mb-2">Recherche…</div>}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {resultats.map(s => (
            <div key={s.matricule} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
              <div>
                <div className="font-medium">{s.prenom} {s.nom}</div>
                <div className="text-xs text-gray-500">{s.classe} • N{s.niveau}</div>
              </div>
              <button
                onClick={() => assigner(s)}
                disabled={verrouille || !selectionGroupe}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >+ Ajouter</button>
            </div>
          ))}
          {searchTerm.length >= 2 && !searching && resultats.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">Aucun résultat.</div>
          )}
        </div>
      </div>

      {/* Colonne droite : membres du groupe sélectionné */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-semibold text-gray-900">Membres du groupe</h3>
          <select
            value={selectionGroupe}
            onChange={(e) => setSelectionGroupe(e.target.value)}
            className="ml-auto px-2 py-1 border rounded text-sm"
          >
            {groupes.map(g => (
              <option key={g.id} value={g.id}>
                {g.nom} {(() => { const lf = g.localisation_fixe; const l = Array.isArray(lf) ? lf[0] : lf; return l ? `(${l.id})` : ''; })()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {(membresParGroupe[selectionGroupe] || []).map(m => (
            <div key={m.id} className={`flex justify-between items-center p-2 rounded text-sm ${m.manuel ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
              <div>
                <div className="font-medium">
                  {m.type === 'employee' ? '👨‍🏫' : '👤'} {m.prenom} {m.nom}
                  {m.manuel && <span className="ml-2 text-xs text-purple-700">manuel</span>}
                </div>
                <div className="text-xs text-gray-500">{m.classe}</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleManuel(m)}
                  disabled={verrouille}
                  className="px-2 py-1 text-xs border rounded hover:bg-white disabled:opacity-50"
                  title="Basculer manuel"
                >🔒</button>
                <button
                  onClick={() => retirer(m.id)}
                  disabled={verrouille}
                  className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                >✕</button>
              </div>
            </div>
          ))}
          {(membresParGroupe[selectionGroupe] || []).length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">Groupe vide.</div>
          )}
        </div>
      </div>
    </div>
  );
}