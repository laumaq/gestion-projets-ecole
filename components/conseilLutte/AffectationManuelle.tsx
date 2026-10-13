// /components/conseilLutte/AffectationManuelle.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { chargerAnimateursPhase, nommerAnimateur, retirerAnimateur } from '@/lib/conseilLutte/animateurs';

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
  const [animateursSet, setAnimateursSet] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectionGroupe && groupes.length > 0) setSelectionGroupe(groupes[0].id);
  }, [groupes]);

  useEffect(() => {
    chargerAnimateursPhase(phaseId).then(setAnimateursSet);
  }, [phaseId]);

  useEffect(() => {
    if (selectionGroupe) loadMembres(selectionGroupe);
  }, [selectionGroupe, animateursSet]);

  useEffect(() => {
    const t = setTimeout(() => { if (searchTerm.length >= 2) doSearch(); else setResultats([]); }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const doSearch = async () => {
    setSearching(true);
    const q = searchTerm.trim();

    const [elevesRes, employesRes] = await Promise.all([
      supabase
        .from('students')
        .select('matricule, nom, prenom, classe, niveau')
        .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,classe.ilike.%${q}%`)
        .not('niveau', 'eq', '0')
        .limit(20),
      supabase
        .from('employees')
        .select('id, nom, prenom, job, initiale')
        .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
        .limit(20),
    ]);

    const eleves = (elevesRes.data || [])
      .filter(s => !s.nom.toLowerCase().includes('testeur'))
      .map(s => ({
        id: s.matricule.toString(),
        matricule: s.matricule,
        nom: s.nom,
        prenom: s.prenom,
        classe: s.classe,
        niveau: s.niveau,
        type: 'student' as const,
      }));

    const employes = (employesRes.data || []).map(e => ({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      job: e.job,
      initiale: e.initiale,
      roleLabel: e.job === 'educ' ? 'Éducateur·rice' : (e.job === 'direction' ? 'Direction' : 'Prof'),
      type: 'employee' as const,
    }));

    const tous = [...eleves, ...employes].sort((a, b) =>
      (a.nom || '').localeCompare(b.nom || '')
    );

    setResultats(tous);
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
      elevesIds.length > 0
        ? supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', elevesIds)
        : Promise.resolve({ data: [] as any[] }),
      employesIds.length > 0
        ? supabase.from('employees').select('id, nom, prenom, job').in('id', employesIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const elevesMap: Record<string, any> = {};
    (eRes.data || []).forEach((s: any) => elevesMap[s.matricule] = s);
    const profsMap: Record<string, any> = {};
    (pRes.data || []).forEach((p: any) => profsMap[p.id] = p);

    const enriched = (mb || []).map(m => {
      if (m.participant_type === 'student') {
        const s = elevesMap[m.participant_id];
        const matricule = parseInt(m.participant_id);
        return {
          ...m,
          nom: s?.nom,
          prenom: s?.prenom,
          classe: s?.classe,
          type: 'student',
          matricule,
          isAnimateur: animateursSet.has(matricule),
        };
      } else {
        const p = profsMap[m.participant_id];
        return {
          ...m,
          nom: p?.nom,
          prenom: p?.prenom,
          classe: p?.job === 'educ' ? 'Éducateur' : (p?.job === 'direction' ? 'Direction' : 'Prof'),
          type: 'employee',
          isAnimateur: false,
        };
      }
    });

    enriched.sort((a, b) => {
      const rankA = a.type === 'employee' ? 0 : (a.isAnimateur ? 1 : 2);
      const rankB = b.type === 'employee' ? 0 : (b.isAnimateur ? 1 : 2);
      if (rankA !== rankB) return rankA - rankB;
      const aClasse = a.type === 'student' ? (a.classe || '') : '';
      const bClasse = b.type === 'student' ? (b.classe || '') : '';
      if (aClasse !== bClasse) return aClasse.localeCompare(bClasse);
      return (a.nom || '').localeCompare(b.nom || '');
    });

    setMembresParGroupe(prev => ({ ...prev, [groupeId]: enriched }));
  };

  const toggleAnimateur = async (m: any) => {
    if (verrouille || m.type !== 'student') return;
    setSaving(true);

    if (m.isAnimateur) {
      await retirerAnimateur(m.matricule, phaseId);
      const next = new Set(animateursSet);
      next.delete(m.matricule);
      setAnimateursSet(next);
    } else {
      await nommerAnimateur(m.matricule, phaseId);
      await supabase.from('conseil_lutte_membres').update({ manuel: true }).eq('id', m.id);
      const next = new Set(animateursSet);
      next.add(m.matricule);
      setAnimateursSet(next);
    }

    setSaving(false);
  };

  const assigner = async (item: any) => {
    if (verrouille) return;
    if (!selectionGroupe) { alert('Sélectionnez un groupe.'); return; }

    const participantId = item.type === 'student' ? item.matricule.toString() : item.id;

    const { data: existant } = await supabase
      .from('conseil_lutte_membres')
      .select(`id, groupe_id, conseil_lutte_groupes!inner(phase_id)`)
      .eq('participant_id', participantId)
      .eq('participant_type', item.type)
      .eq('conseil_lutte_groupes.phase_id', phaseId);

    if (existant && existant.length > 0) {
      const dansLeMemeGroupe = existant.some(e => e.groupe_id === selectionGroupe);
      if (dansLeMemeGroupe) return;

      if (!confirm(`${item.prenom} ${item.nom} est déjà dans un groupe de cette phase. Déplacer ?`)) return;
      await supabase.from('conseil_lutte_membres').delete().in('id', existant.map(e => e.id));
    }

    await supabase.from('conseil_lutte_membres').insert({
      groupe_id: selectionGroupe,
      participant_id: participantId,
      participant_type: item.type,
      manuel: true,
    });

    await loadMembres(selectionGroupe);
    onRefresh();
  };

  const retirer = async (m: any) => {
    if (verrouille) return;

    if (m.type === 'student' && m.isAnimateur) {
      if (!confirm(
        `${m.prenom} ${m.nom} est animateur·rice de cette phase.\n\n` +
        `Le retirer du groupe va aussi retirer son statut d'animateur·rice.\n\nConfirmer ?`
      )) return;
      await retirerAnimateur(m.matricule, phaseId);
      const next = new Set(animateursSet);
      next.delete(m.matricule);
      setAnimateursSet(next);
    } else {
      if (!confirm('Retirer cette personne du groupe ?')) return;
    }

    await supabase.from('conseil_lutte_membres').delete().eq('id', m.id);
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
      {/* Colonne gauche : recherche */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Rechercher un élève ou un membre du personnel
        </h3>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nom, prénom, classe…"
          className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
        />
        {searching && <div className="text-xs text-gray-400 mb-2">Recherche…</div>}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {resultats.map(r => {
            const isAnimateur = r.type === 'student' && animateursSet.has(r.matricule);
            return (
              <div
                key={`${r.type}-${r.id}`}
                className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.type === 'employee' ? '👨‍🏫' : (isAnimateur ? '👑' : '👤')} {r.prenom} {r.nom}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.type === 'employee' ? r.roleLabel : `${r.classe} • N${r.niveau}`}
                  </div>
                </div>
                <button
                  onClick={() => assigner(r)}
                  disabled={verrouille || !selectionGroupe}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex-shrink-0 ml-2"
                >+ Ajouter</button>
              </div>
            );
          })}
          {searchTerm.length >= 2 && !searching && resultats.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">Aucun résultat.</div>
          )}
        </div>
      </div>

      {/* Colonne droite : membres */}
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
            <div
              key={m.id}
              className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {m.type === 'employee' ? '👨‍🏫' : (m.isAnimateur ? '👑' : '👤')} {m.prenom} {m.nom}
                </div>
                <div className="text-xs text-gray-500">{m.classe}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {m.type === 'student' && (
                  <button
                    onClick={() => toggleAnimateur(m)}
                    disabled={verrouille || saving}
                    className={`px-2 py-1 text-xs border rounded disabled:opacity-50 ${
                      m.isAnimateur
                        ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-purple-50'
                    }`}
                    title={m.isAnimateur ? 'Retirer le rôle d\'animateur·rice' : 'Nommer animateur·rice'}
                  >
                    👑
                  </button>
                )}
                <button
                  onClick={() => toggleManuel(m)}
                  disabled={verrouille}
                  className="px-2 py-1 text-xs border rounded hover:bg-white disabled:opacity-50"
                  title="Basculer manuel"
                >🔒</button>
                <button
                  onClick={() => retirer(m)}
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