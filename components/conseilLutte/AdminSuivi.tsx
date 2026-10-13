// /components/conseilLutte/AdminSuivi.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  config: any;
  phaseId?: string;
}

const PHASE_LABEL: Record<string, string> = {
  informer: 'I — Informer',
  proposer: 'II — Proposer',
  discuter: 'III — Discuter',
  decider: 'IV — Décider',
  mandater: 'V — Mandater',
};

const PHASE_ORDRE = ['informer', 'proposer', 'discuter', 'decider', 'mandater'];

const PHASE_STYLE: Record<string, { border: string; bg: string; text: string }> = {
  informer: { border: 'border-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-800' },
  proposer: { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-800' },
  discuter: { border: 'border-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-800' },
  decider:  { border: 'border-orange-400',  bg: 'bg-orange-50',  text: 'text-orange-800' },
  mandater: { border: 'border-red-400',     bg: 'bg-red-50',     text: 'text-red-800' },
};

export default function AdminSuivi({ config, phaseId }: Props) {
  const [donnees, setDonnees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [phaseId]);

  const load = async () => {
    const { data: phases } = await supabase
      .from('conseil_lutte_phases')
      .select('id, nom, heure_debut, heure_fin, ordre')
      .eq('config_id', config.id)
      .order('ordre');

    let phasesFiltrees = phases || [];
    if (phaseId) phasesFiltrees = phasesFiltrees.filter(p => p.id === phaseId);

    const tousGroupes: any[] = [];
    for (const ph of phasesFiltrees) {
      const { data: gr } = await supabase
        .from('conseil_lutte_groupes')
        .select(`id, nom, phase_id, phase_pedagogique, localisation_fixe (id, etage)`)
        .eq('phase_id', ph.id);
      (gr || []).forEach(g => tousGroupes.push({ ...g, phase_nom: ph.nom }));
    }

    if (tousGroupes.length === 0) {
      setDonnees([]); setLoading(false); return;
    }

    const groupesIds = tousGroupes.map(g => g.id);
    const phasesIds = phasesFiltrees.map(p => p.id);

    // Animateurs par phase
    const { data: animateurs } = await supabase
      .from('conseil_lutte_animateurs')
      .select('student_matricule, phase_id')
      .in('phase_id', phasesIds);

    const animSetParPhase: Record<string, Set<number>> = {};
    phasesIds.forEach(pid => { animSetParPhase[pid] = new Set(); });
    (animateurs || []).forEach(a => {
      if (a.phase_id && animSetParPhase[a.phase_id]) {
        animSetParPhase[a.phase_id].add(a.student_matricule);
      }
    });

    // Récupérer les infos des élèves animateurs (toutes phases confondues)
    const animMatricules = Array.from(new Set((animateurs || []).map(a => a.student_matricule)));
    const { data: animEleves } = animMatricules.length > 0
      ? await supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', animMatricules)
      : { data: [] as any[] };
    const animInfo: Record<number, any> = {};
    (animEleves || []).forEach((s: any) => { animInfo[s.matricule] = s; });

    // Membres
    const { data: mbs } = await supabase
      .from('conseil_lutte_membres')
      .select('groupe_id, participant_id, participant_type')
      .in('groupe_id', groupesIds);

    const encadrantsIds: string[] = [];
    const elevesIds: number[] = [];
    (mbs || []).forEach(m => {
      if (m.participant_type === 'employee') encadrantsIds.push(m.participant_id);
      else elevesIds.push(parseInt(m.participant_id));
    });

    const [encadsRes, elevesRes] = await Promise.all([
      encadrantsIds.length > 0
        ? supabase.from('employees').select('id, nom, prenom, job').in('id', encadrantsIds)
        : Promise.resolve({ data: [] as any[] }),
      elevesIds.length > 0
        ? supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', elevesIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const encadInfo: Record<string, any> = {};
    (encadsRes.data || []).forEach((e: any) => { encadInfo[e.id] = e; });
    const eleveInfo: Record<number, any> = {};
    (elevesRes.data || []).forEach((s: any) => { eleveInfo[s.matricule] = s; });

    // Soutiens ouverts
  const { data: soutiens } = await supabase
    .from('conseil_lutte_soutiens')
    .select('id, groupe_id, demandeur_type, demandeur_id, message, created_at')
    .in('groupe_id', groupesIds)
    .eq('statut', 'ouvert');

  // Récupérer les noms des demandeurs
  const demElevesIds: number[] = [];
  const demEmployesIds: string[] = [];
  (soutiens || []).forEach(s => {
    if (s.demandeur_type === 'student') demElevesIds.push(parseInt(s.demandeur_id));
    else demEmployesIds.push(s.demandeur_id);
  });

  const [demElevesRes, demEmployesRes] = await Promise.all([
    demElevesIds.length > 0
      ? supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', demElevesIds)
      : Promise.resolve({ data: [] as any[] }),
    demEmployesIds.length > 0
      ? supabase.from('employees').select('id, nom, prenom, job').in('id', demEmployesIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const demElevesMap: Record<number, any> = {};
  (demElevesRes.data || []).forEach((s: any) => { demElevesMap[s.matricule] = s; });
  const demEmployesMap: Record<string, any> = {};
  (demEmployesRes.data || []).forEach((e: any) => { demEmployesMap[e.id] = e; });

  const soutienParGroupe: Record<string, any> = {};
  (soutiens || []).forEach(s => {
    const dem = s.demandeur_type === 'student'
      ? demElevesMap[parseInt(s.demandeur_id)]
      : demEmployesMap[s.demandeur_id];
    soutienParGroupe[s.groupe_id] = {
      ...s,
      demandeur_nom: dem ? `${dem.prenom} ${dem.nom}` : '—',
      demandeur_classe: dem?.classe || null,
    };
  });

    // Assemblage
    const result = tousGroupes.map(g => {
      const membresDuGroupe = (mbs || []).filter(m => m.groupe_id === g.id);

      const encadsGroupe = membresDuGroupe
        .filter(m => m.participant_type === 'employee')
        .map(m => encadInfo[m.participant_id])
        .filter(Boolean);

      const elevesCount = membresDuGroupe.filter(m => m.participant_type === 'student').length;

      // Animateurs = élèves du groupe dont le matricule est dans le set de la phase
      const animSet = animSetParPhase[g.phase_id] || new Set<number>();
      const animateursListe = membresDuGroupe
        .filter(m => m.participant_type === 'student' && animSet.has(parseInt(m.participant_id)))
        .map(m => {
          const s = eleveInfo[parseInt(m.participant_id)];
          return s ? { matricule: s.matricule, nom: s.nom, prenom: s.prenom, classe: s.classe } : null;
        })
        .filter(Boolean);

      const lf = Array.isArray(g.localisation_fixe) ? g.localisation_fixe[0] : g.localisation_fixe;

      return {
        groupe_id: g.id,
        groupe_nom: g.nom,
        phase_nom: g.phase_nom,
        local: lf?.id,
        etage: lf?.etage,
        animateurs: animateursListe,
        encadrants: encadsGroupe,
        eleves_count: elevesCount,
        phase_pedagogique: g.phase_pedagogique || 'informer',
        soutien: soutienParGroupe[g.id] || null,
      };
    }).sort((a, b) => {
      const ea = Number(a.etage) || 99;
      const eb = Number(b.etage) || 99;
      if (ea !== eb) return ea - eb;
      return (a.local || '').localeCompare(b.local || '', undefined, { numeric: true });
    });

    setDonnees(result);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8">Chargement…</div>;

  const groupesAvecSoutien = donnees.filter(d => d.soutien);
  const groupesSansSoutien = donnees.filter(d => !d.soutien);

  const parPhase: Record<string, any[]> = {};
  PHASE_ORDRE.forEach(p => { parPhase[p] = []; });
  groupesSansSoutien.forEach(d => {
    const p = d.phase_pedagogique || 'informer';
    if (!parPhase[p]) parPhase[p] = [];
    parPhase[p].push(d);
  });

  const leverSoutien = async (soutienId: string) => {
    if (!confirm('Lever cette demande de soutien ?')) return;
    const { error } = await supabase
      .from('conseil_lutte_soutiens')
      .update({
        statut: 'traite',
        traite_at: new Date().toISOString(),
        traite_par: 'admin',
      })
      .eq('id', soutienId);
    if (error) { alert('Erreur : ' + error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-4 flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Suivi temps réel</h2>
          <p className="text-xs text-gray-500">
            {donnees.length} groupes ·{' '}
            {groupesAvecSoutien.length > 0
              ? <span className="text-red-700 font-semibold">
                  {groupesAvecSoutien.length} demande{groupesAvecSoutien.length > 1 ? 's' : ''} de soutien
                </span>
              : 'aucune demande de soutien'}
          </p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700">
          ⟳ Rafraîchir
        </button>
      </div>

      {groupesAvecSoutien.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide">
              🆘 Demandes de soutien
            </h3>
            <div className="flex-1 h-px bg-red-300" />
            <span className="text-xs text-red-600">
              {groupesAvecSoutien.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupesAvecSoutien.map(d => <CarteGroupe key={d.groupe_id} d={d} onLeverSoutien={leverSoutien} />)}
          </div>
        </section>
      )}

      {PHASE_ORDRE.map(phaseKey => {
        const groupes = parPhase[phaseKey] || [];
        if (groupes.length === 0) return null;
        const style = PHASE_STYLE[phaseKey] || PHASE_STYLE.informer;
        return (
          <section key={phaseKey}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className={`text-sm font-bold uppercase tracking-wide ${style.text}`}>
                {PHASE_LABEL[phaseKey]}
              </h3>
              <div className={`flex-1 h-px ${style.border.replace('border-', 'bg-')}`} />
              <span className={`text-xs ${style.text}`}>
                {groupes.length} groupe{groupes.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupes.map(d => <CarteGroupe key={d.groupe_id} d={d} onLeverSoutien={leverSoutien} />)}            
            </div>
          </section>
        );
      })}

      {donnees.length === 0 && (
        <div className="text-center py-12 text-gray-500">Aucun groupe à afficher.</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CarteGroupe({ d, onLeverSoutien }: { d: any; onLeverSoutien: (id: string) => void }) {
  const style = PHASE_STYLE[d.phase_pedagogique] || PHASE_STYLE.informer;
  return (
    <div className={`bg-white border rounded-lg p-4 ${
      d.soutien ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold text-gray-900">
            {d.groupe_nom}
            {d.local && <span className="text-sm font-normal text-gray-500 ml-1">· {d.local}</span>}
          </div>
          <div className="text-xs text-gray-500">
            {d.phase_nom}
            {d.etage && ` · Étage ${d.etage}`}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
          {PHASE_LABEL[d.phase_pedagogique] || d.phase_pedagogique}
        </span>
      </div>

      <div className="text-xs text-gray-600 space-y-1 mb-2">
        <div>
          👑 {d.animateurs.length > 0
            ? d.animateurs.map((a: any) => `${a.prenom} ${a.nom}`).join(', ')
            : <span className="text-gray-400">Pas d'animateur</span>}
        </div>
        <div>
          👨‍🏫 {d.encadrants.length > 0
            ? d.encadrants.map((e: any) => `${e.prenom} ${e.nom[0]}.`).join(', ')
            : <span className="text-gray-400">Aucun encadrant</span>}
        </div>
        <div>👤 {d.eleves_count} élève{d.eleves_count > 1 ? 's' : ''}</div>
      </div>

      {d.soutien && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
          <div>
            🆘 <strong>Soutien demandé</strong>
            {' '}par{' '}
            {d.soutien.demandeur_nom}
            {' '}
            <span className="text-red-600">
              ({d.soutien.demandeur_type === 'student' ? 'animateur·rice' : 'encadrant·e'})
            </span>
          </div>
          {d.soutien.demandeur_classe && (
            <div className="mt-0.5 text-red-600">{d.soutien.demandeur_classe}</div>
          )}
          {d.soutien.message && (
            <div className="mt-1 italic">« {d.soutien.message} »</div>
          )}
          <button
            onClick={() => onLeverSoutien(d.soutien.id)}
            className="mt-2 px-2 py-1 text-xs bg-white border border-red-300 text-red-700 rounded hover:bg-red-100"
          >
            Lever la demande
          </button>
        </div>
      )}
    </div>
  );
}