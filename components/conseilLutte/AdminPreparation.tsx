// /components/conseilLutte/AdminPreparation.tsx

// /components/conseilLutte/AdminPreparation.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminPhase from './AdminPhase';
import AdminSuivi from './AdminSuivi';

const ORDRE_ETAGES: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, 'Annexe': 7,
};

function trierLocaux(locaux: { id: string; etage: string }[]) {
  return [...locaux].sort((a, b) => {
    const ea = ORDRE_ETAGES[a.etage] ?? 99;
    const eb = ORDRE_ETAGES[b.etage] ?? 99;
    if (ea !== eb) return ea - eb;
    return a.id.localeCompare(b.id);
  });
}

interface Props {
  config: any;
  phases: any[];
  phaseActiveId: string | null;
  onPhaseChange: (id: string) => void;
  onRefresh: () => void;
}

export default function AdminPreparation({ config, phases, onRefresh }: Props) {
  const [onglet, setOnglet] = useState<'preparation' | 'suivi'>('preparation');
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [nom, setNom] = useState('Phase 1');
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('10:30');
  const [nbGroupes, setNbGroupes] = useState(4);
  const [inscriptionOuverte, setInscriptionOuverte] = useState(false);
  const [repartitionParAnnee, setRepartitionParAnnee] = useState(true);
  const [modeClasses, setModeClasses] = useState<'groupees' | 'aleatoire' | 'dispersees'>('aleatoire');
  const [creating, setCreating] = useState(false);
  const [nominatingAnimateurs, setNominatingAnimateurs] = useState(false);

  const [cfgLocal, setCfgLocal] = useState(config);
  useEffect(() => { setCfgLocal(config); }, [config]);

  // --- Interrupteurs globaux d'accès ---
  const setConfigFlag = async (patch: Record<string, any>) => {
    setCfgLocal((prev: any) => ({ ...prev, ...patch }));
    const { error } = await supabase
      .from('conseil_lutte_configs')
      .update(patch)
      .eq('id', config.id);
    if (error) {
      setCfgLocal(config);
      alert('Erreur : ' + error.message);
    }
  };

  // --- Créer une phase + N groupes + auto-fill des locaux ---
  const creerPhase = async () => {
    if (creating) return;
    if (nbGroupes < 1 || nbGroupes > 60) {
      alert('Le nombre de groupes doit être entre 1 et 60.');
      return;
    }
    setCreating(true);

    const ordre = phases.length > 0 ? Math.max(...phases.map(p => p.ordre || 0)) + 1 : 1;

    const { data: phase, error: pErr } = await supabase
      .from('conseil_lutte_phases')
      .insert({
        config_id: config.id,
        nom,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        ordre,
        nb_groupes: nbGroupes,
        inscription_eleves_ouverte: inscriptionOuverte,
        repartition_par_annee: repartitionParAnnee,
        mode_repartition_classes: modeClasses,
        repartition_faite: false,
        verrouille: false,
      })
      .select()
      .single();

    if (pErr || !phase) {
      alert('Erreur création phase : ' + pErr?.message);
      setCreating(false);
      return;
    }

    // Auto-fill locaux étage 1 → Annexe
    const { data: locaux } = await supabase.from('localisation_fixe').select('id, etage');
    const tries = trierLocaux(locaux || []);

    const groupes = Array.from({ length: nbGroupes }, (_, i) => ({
      phase_id: phase.id,
      nom: `Groupe ${i + 1}`,
      localisation_id: tries[i]?.id ?? null,
      capacite_max: null,
      notes: null,
    }));

    const { error: gErr } = await supabase.from('conseil_lutte_groupes').insert(groupes);
    if (gErr) {
      alert('Groupes créés partiellement. Erreur : ' + gErr.message);
    }

    setCreating(false);
    setShowCreate(false);
    onRefresh();
  };

  const supprimerPhase = async (phaseId: string) => {
    if (!confirm('Supprimer cette phase et tous ses groupes/affectations ?')) return;
    await supabase.from('conseil_lutte_phases').delete().eq('id', phaseId);
    onRefresh();
  };

  // --- Nommer les animateurs ---
  const nommerAnimateurs = async () => {
    if (!confirm(
      'Nommer les animateurs ?\n\n' +
      'Pour chaque groupe de chaque phase : il faut exactement UN élève marqué manuel.\n' +
      'Les animateurs existants seront remplacés.'
    )) return;
    setNominatingAnimateurs(true);
    try {
      // 1. Toutes les phases de la config
      const { data: toutesPhases, error: pErr } = await supabase
        .from('conseil_lutte_phases')
        .select('id, nom')
        .eq('config_id', config.id);
      if (pErr) throw pErr;
      if (!toutesPhases || toutesPhases.length === 0) throw new Error('Aucune phase.');

      // 2. Tous les groupes
      const { data: tousGroupes, error: gErr } = await supabase
        .from('conseil_lutte_groupes')
        .select('id, nom, phase_id')
        .in('phase_id', toutesPhases.map(p => p.id));
      if (gErr) throw gErr;
      if (!tousGroupes || tousGroupes.length === 0) throw new Error('Aucun groupe.');

      // 3. Élèves manuels
      const { data: manuels, error: mErr } = await supabase
        .from('conseil_lutte_membres')
        .select('groupe_id, participant_id')
        .in('groupe_id', tousGroupes.map(g => g.id))
        .eq('participant_type', 'student')
        .eq('manuel', true);
      if (mErr) throw mErr;

      const parGroupe: Record<string, string[]> = {};
      tousGroupes.forEach(g => { parGroupe[g.id] = []; });
      (manuels || []).forEach(m => { parGroupe[m.groupe_id].push(m.participant_id); });

      // 4. Vérifier : exactement 1 par groupe
      const phaseNomParId: Record<string, string> = {};
      toutesPhases.forEach(p => { phaseNomParId[p.id] = p.nom; });

      const erreurs: string[] = [];
      for (const g of tousGroupes) {
        const n = parGroupe[g.id].length;
        if (n !== 1) {
          erreurs.push(`${g.nom} (${phaseNomParId[g.phase_id]}) : ${n} manuel${n > 1 ? 's' : ''}`);
        }
      }

      if (erreurs.length > 0) {
        alert(
          `Impossible : chaque groupe doit avoir exactement 1 élève marqué manuel.\n\n` +
          `Problèmes :\n- ${erreurs.slice(0, 10).join('\n- ')}` +
          (erreurs.length > 10 ? `\n… et ${erreurs.length - 10} autres.` : '')
        );
        setNominatingAnimateurs(false);
        return;
      }

      // 5. Insertion (nouveau schéma : PK = student_matricule)
      const rows = tousGroupes.map(g => ({
        student_matricule: parseInt(parGroupe[g.id][0]),
        groupe_id: g.id,
        nomme_par: 'admin',
      }));

      const matricules = rows.map(r => r.student_matricule);
      await supabase
        .from('conseil_lutte_animateurs')
        .delete()
        .in('student_matricule', matricules);

      const { error } = await supabase
        .from('conseil_lutte_animateurs')
        .insert(rows);
      if (error) throw error;

      alert(`${rows.length} animateur${rows.length > 1 ? 's' : ''} nommé${rows.length > 1 ? 's' : ''}.`);
      onRefresh();
    } catch (e: any) {
      alert('Erreur : ' + (e?.message || e));
    }
    setNominatingAnimateurs(false);
  };

  // --- Vue phase édition ---
  if (editingPhaseId) {
    const phase = phases.find(p => p.id === editingPhaseId);
    return (
      <AdminPhase
        phase={phase}
        config={config}
        onBack={() => { setEditingPhaseId(null); onRefresh(); }}
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Onglets */}
      <div className="flex gap-2">
        <button
          onClick={() => setOnglet('preparation')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            onglet === 'preparation'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >Préparation</button>
        <button
          onClick={() => setOnglet('suivi')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            onglet === 'suivi'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >Suivi temps réel</button>
      </div>

      {onglet === 'suivi' ? (
        <AdminSuivi config={config} />
      ) : (
        <>
          {/* ═══════════════════════════════════════════ */}
          {/* CONTRÔLE D'ACCÈS                            */}
          {/* ═══════════════════════════════════════════ */}
          <div className="bg-white border-2 border-red-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">🔐</div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Contrôle d'accès</h3>
                <p className="text-xs text-gray-500">Qui voit l'outil, et à quelles conditions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                cfgLocal.acces_employees ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-emerald-300'
              }`}>
                <input type="checkbox" checked={!!cfgLocal.acces_employees}
                  onChange={(e) => setConfigFlag({ acces_employees: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-emerald-600" />
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">Accès employés</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Les employés peuvent ouvrir l'outil à la main (URL, carte du dashboard).
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                cfgLocal.acces_students ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-emerald-300'
              }`}>
                <input type="checkbox" checked={!!cfgLocal.acces_students}
                  onChange={(e) => setConfigFlag({ acces_students: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-emerald-600" />
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">Accès élèves</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Les élèves peuvent ouvrir l'outil à la main (URL, carte du dashboard).
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                cfgLocal.redirect_employees ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'
              }`}>
                <input type="checkbox" checked={!!cfgLocal.redirect_employees}
                  onChange={(e) => setConfigFlag({ redirect_employees: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-red-600" />
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">Redirection employés</div>
                  <div className="text-xs text-gray-600 mt-1">
                    À la connexion, les employés sont envoyés directement ici.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                cfgLocal.redirect_students ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'
              }`}>
                <input type="checkbox" checked={!!cfgLocal.redirect_students}
                  onChange={(e) => setConfigFlag({ redirect_students: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-red-600" />
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">Redirection élèves</div>
                  <div className="text-xs text-gray-600 mt-1">
                    À la connexion, les élèves sont envoyés directement ici.
                  </div>
                </div>
              </label>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Visibilité de la carte sur le dashboard</h4>
              <p className="text-xs text-gray-500 mb-3">
                La carte « Conseil de lutte » apparaît sur le dashboard entre ces deux dates (incluses).
                Vide = toujours visible pour ceux qui ont accès.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Du</label>
                  <input type="date"
                    value={cfgLocal.date_debut_visibilite || ''}
                    onChange={(e) => setConfigFlag({ date_debut_visibilite: e.target.value || null })}
                    className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Au</label>
                  <input type="date"
                    value={cfgLocal.date_fin_visibilite || ''}
                    onChange={(e) => setConfigFlag({ date_fin_visibilite: e.target.value || null })}
                    className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* PHASES                                      */}
          {/* ═══════════════════════════════════════════ */}
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Phases de la journée</h2>
              <p className="text-sm text-gray-500">Créez une phase par créneau. Chaque phase a sa propre répartition.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={nommerAnimateurs}
                disabled={nominatingAnimateurs || phases.length === 0}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {nominatingAnimateurs ? 'Nomination…' : '👑 Nommer les animateurs'}
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                + Nouvelle phase
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {phases.map(p => (
              <div key={p.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-gray-900">{p.nom}</div>
                    <div className="text-xs text-gray-500">{p.heure_debut} – {p.heure_fin}</div>
                  </div>
                  <div className="flex gap-2">
                    {p.verrouille && <span className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded">🔒</span>}
                    {p.repartition_faite && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓</span>}
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1 mb-3">
                  <div>📦 {p.nb_groupes} groupe{p.nb_groupes > 1 ? 's' : ''}</div>
                  <div>✍️ Inscription élèves : {p.inscription_eleves_ouverte ? 'ouverte' : 'fermée'}</div>
                  <div>🎲 Classes : {p.mode_repartition_classes}</div>
                  <div>🎓 Par niveau : {p.repartition_par_annee ? 'oui' : 'non'}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPhaseId(p.id)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800"
                  >
                    Gérer
                  </button>
                  <button
                    onClick={() => supprimerPhase(p.id)}
                    className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {phases.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                Aucune phase. Créez la première.
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* MODAL CRÉATION PHASE                        */}
          {/* ═══════════════════════════════════════════ */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Nouvelle phase</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom</label>
                    <input
                      value={nom} onChange={(e) => setNom(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Phase 1 — Matin"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Début</label>
                      <input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fin</label>
                      <input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre de groupes</label>
                    <input
                      type="number" min={1} max={60} value={nbGroupes}
                      onChange={(e) => setNbGroupes(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Les locaux seront assignés automatiquement (étage 1 → Annexe) et modifiables ensuite.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Réglages</h4>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={inscriptionOuverte}
                        onChange={(e) => setInscriptionOuverte(e.target.checked)} />
                      <span className="text-sm">Autoriser les élèves à s'inscrire eux-mêmes</span>
                    </label>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={repartitionParAnnee}
                        onChange={(e) => setRepartitionParAnnee(e.target.checked)} />
                      <span className="text-sm">Répartir équitablement par niveau</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium mb-1">Répartition des classes</label>
                      <select
                        value={modeClasses}
                        onChange={(e) => setModeClasses(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="groupees">Classes groupées (même classe ensemble)</option>
                        <option value="aleatoire">Aléatoire pur</option>
                        <option value="dispersees">Classes dispersées (min. de même classe par groupe)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <button onClick={() => setShowCreate(false)}
                    className="px-4 py-2 border rounded-lg">Annuler</button>
                  <button onClick={creerPhase} disabled={creating}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
                    {creating ? 'Création…' : 'Créer la phase'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}