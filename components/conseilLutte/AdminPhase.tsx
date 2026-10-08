// /components/conseilLutte/AdminPhase.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminGroupes from './AdminGroupes';
import AffectationManuelle from './AffectationManuelle';
import { repartirAuto } from './repartition';

interface Props {
  phase: any;
  config: any;
  onBack: () => void;
}

export default function AdminPhase({ phase, config, onBack }: Props) {
  const [tab, setTab] = useState<'groupes' | 'manuelle' | 'auto'>('groupes');
  const [groupes, setGroupes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  // Édition des réglages
  const [edit, setEdit] = useState({
    nom: phase.nom,
    heure_debut: phase.heure_debut,
    heure_fin: phase.heure_fin,
    inscription_eleves_ouverte: phase.inscription_eleves_ouverte,
    repartition_par_annee: phase.repartition_par_annee,
    mode_repartition_classes: phase.mode_repartition_classes,
    verrouille: phase.verrouille,
  });

  useEffect(() => { load(); }, [phase.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('conseil_lutte_groupes')
      .select(`id, nom, localisation_id, capacite_max, localisation_fixe (id, etage)`)
      .eq('phase_id', phase.id)
      .order('nom');
    setGroupes(data || []);
    setLoading(false);
  };

  const saveReglages = async () => {
    await supabase.from('conseil_lutte_phases').update(edit).eq('id', phase.id);
    alert('Réglages enregistrés.');
  };

  const lancerRepartition = async () => {
    if (!confirm('Lancer la répartition automatique ?\n\nLes élèves marqués "manuel" seront préservés. Les autres seront répartis.')) return;
    setWorking(true);
    try {
      const res = await repartirAuto({
        phaseId: phase.id,
        nbGroupes: groupes.length,
        parAnnee: edit.repartition_par_annee,
        modeClasses: edit.mode_repartition_classes,
      });
      alert(`Répartition effectuée.\n\n${res.elevesPlaces} élèves placés.\n${res.elevesIgnores} ignorés (testeur / niveau 0).`);
      await supabase.from('conseil_lutte_phases')
        .update({ repartition_faite: true }).eq('id', phase.id);
      load();
    } catch (e: any) {
      alert('Erreur : ' + (e?.message || e));
    }
    setWorking(false);
  };

  const toggleVerrou = async () => {
    const next = !edit.verrouille;
    setEdit({ ...edit, verrouille: next });
    await supabase.from('conseil_lutte_phases').update({ verrouille: next }).eq('id', phase.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-600 hover:text-red-600">← Toutes les phases</button>
        <button
          onClick={toggleVerrou}
          className={`px-3 py-1.5 text-sm rounded-lg border ${
            edit.verrouille
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {edit.verrouille ? '🔒 Verrouillée' : '🔓 Verrouiller'}
        </button>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{phase.nom}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">Nom</label>
            <input value={edit.nom} onChange={(e) => setEdit({ ...edit, nom: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Début</label>
            <input type="time" value={edit.heure_debut}
              onChange={(e) => setEdit({ ...edit, heure_debut: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Fin</label>
            <input type="time" value={edit.heure_fin}
              onChange={(e) => setEdit({ ...edit, heure_fin: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={saveReglages}
              className="w-full px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800">
              Enregistrer
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={edit.inscription_eleves_ouverte}
              onChange={(e) => setEdit({ ...edit, inscription_eleves_ouverte: e.target.checked })} />
            <span className="text-sm">Inscriptions élèves ouvertes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={edit.repartition_par_annee}
              onChange={(e) => setEdit({ ...edit, repartition_par_annee: e.target.checked })} />
            <span className="text-sm">Répartition par niveau</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Classes :</span>
            <select value={edit.mode_repartition_classes}
              onChange={(e) => setEdit({ ...edit, mode_repartition_classes: e.target.value })}
              className="px-2 py-1 border rounded text-sm">
              <option value="groupees">Groupées</option>
              <option value="aleatoire">Aléatoire</option>
              <option value="dispersees">Dispersées</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {[
          { id: 'groupes', label: `Groupes (${groupes.length})` },
          { id: 'manuelle', label: 'Affectation manuelle' },
          { id: 'auto', label: 'Répartition auto' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              tab === t.id ? 'border-red-600 text-red-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">Chargement…</div>
      ) : tab === 'groupes' ? (
        <AdminGroupes phaseId={phase.id} groupes={groupes} onRefresh={load} verrouille={edit.verrouille} />
      ) : tab === 'manuelle' ? (
        <AffectationManuelle phaseId={phase.id} groupes={groupes} onRefresh={load} verrouille={edit.verrouille} />
      ) : (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Lancer la répartition automatique</h3>
          <p className="text-sm text-gray-600 mb-4">
            Répartit tous les élèves convoqués (hors « testeur » et niveau 0) dans les {groupes.length} groupes.
            Les élèves placés manuellement sont <strong>préservés</strong>. Les autres sont (re)distribués selon les règles de cette phase.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-xs text-yellow-800">
            ⚠️ Action destructive : les affectations non-manuelles existantes pour cette phase seront remplacées.
          </div>
          <button
            onClick={lancerRepartition}
            disabled={working || edit.verrouille || groupes.length === 0}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            {working ? 'Répartition en cours…' : 'Lancer la répartition auto'}
          </button>
          {edit.verrouille && <p className="text-xs text-red-600 mt-2">Phase verrouillée — déverrouillez d'abord.</p>}
        </div>
      )}
    </div>
  );
}