'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ALLOWED_USER_ID = '52793bea-994a-4b50-b768-75427df4747b';

interface ClasseOption   { value: string; label: string }
interface GroupeOption   { value: string; label: string }
interface EmployeeOption { id: string; nom: string; prenom: string; initiale: string }
interface Student        { matricule: number; nom: string; prenom: string; classe: string }

function StepHeader({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${active ? 'border-indigo-200' : 'border-gray-100'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        done ? 'bg-green-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
      }`}>
        {done ? '✓' : n}
      </div>
      <h2 className={`text-base font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</h2>
    </div>
  );
}

export default function NouveauProjetPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [dashboard, setDashboard] = useState<'principal' | 'sciences'>('principal');
  const [consignes, setConsignes] = useState('');
  const [modeSource, setModeSource] = useState<'consultation_seule' | 'unique' | 'differentes' | 'libre'>('consultation_seule');
  const [maxSources, setMaxSources] = useState<number | ''>('');

  // Step 2
  const [classesDisponibles, setClassesDisponibles] = useState<ClasseOption[]>([]);
  const [groupesDisponibles, setGroupesDisponibles] = useState<GroupeOption[]>([]);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);
  const [groupesSelectionnes, setGroupesSelectionnes] = useState<string[]>([]);
  const [rechercheClasse, setRechercheClasse] = useState('');
  const [rechercheGroupe, setRechercheGroupe] = useState('');
  const [elevesParClasse, setElevesParClasse] = useState<Student[]>([]);   // ← déclarés ici
  const [elevesParGroupe, setElevesParGroupe] = useState<Student[]>([]);   // ← déclarés ici
  const [elevesIndividuels, setElevesIndividuels] = useState<Student[]>([]);
  const [exclus, setExclus] = useState<number[]>([]);
  const [filtreNom, setFiltreNom] = useState('');
  const [filtrePrenom, setFiltrePrenom] = useState('');
  const [filtreClasse, setFiltreClasse] = useState('');
  const [rechercheIndividuelle, setRechercheIndividuelle] = useState<Student[]>([]);

  // Step 3
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [accesEmployees, setAccesEmployees] = useState<{ id: string; role: 'responsable' | 'observateur' }[]>([]);
  const [rechercheEmployee, setRechercheEmployee] = useState('');

  // Calculé : union des trois sources moins les exclus
  const elevesSelectionnes: Student[] = (() => {
    const map = new Map<number, Student>();
    [...elevesParClasse, ...elevesParGroupe, ...elevesIndividuels]
      .forEach(e => map.set(e.matricule, e));
    exclus.forEach(m => map.delete(m));
    return Array.from(map.values()).sort((a, b) =>
      a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom)
    );
  })();

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const type = localStorage.getItem('userType');
    if (!id || type !== 'employee' || id !== ALLOWED_USER_ID) { router.push('/dashboard/main'); return; }
    setUserId(id);
    chargerOptions();
  }, [router]);

  const chargerOptions = useCallback(async () => {
    const { data: classeData } = await supabase.from('students').select('classe').order('classe');
    const classes = (classeData || [])
      .map((s: any) => s.classe)
      .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
      .map(c => ({ value: c, label: c }));
    setClassesDisponibles(classes);

    const { data: groupeData } = await supabase.from('students_groups').select('groupe_code');
    const groupes = (groupeData || [])
      .map((g: any) => g.groupe_code)
      .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
      .sort((a: string, b: string) => a.localeCompare(b))
      .map(g => ({ value: g, label: g }));
    setGroupesDisponibles(groupes);

    const { data: empData } = await supabase.from('employees').select('id, nom, prenom, initiale').order('nom');
    setEmployees((empData || []).filter((e: any) => e.id !== ALLOWED_USER_ID));
  }, []);

  // Élèves des classes sélectionnées
  useEffect(() => {
    if (classesSelectionnees.length === 0) { setElevesParClasse([]); return; }
    supabase.from('students')
      .select('matricule, nom, prenom, classe')
      .in('classe', classesSelectionnees)
      .order('classe').order('nom')
      .then(({ data }) => setElevesParClasse(data || []));
  }, [classesSelectionnees]);

  // Élèves des groupes sélectionnés
  useEffect(() => {
    if (groupesSelectionnes.length === 0) { setElevesParGroupe([]); return; }
    supabase.from('students_groups')
      .select('matricule').in('groupe_code', groupesSelectionnes)
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setElevesParGroupe([]); return; }
        const mats: number[] = [];
        data.forEach((g: any) => { if (mats.indexOf(g.matricule) === -1) mats.push(g.matricule); });
        const { data: students } = await supabase.from('students')
          .select('matricule, nom, prenom, classe')
          .in('matricule', mats).order('classe').order('nom');
        setElevesParGroupe(students || []);
      });
  }, [groupesSelectionnes]);

  // Recherche individuelle avec debounce
  useEffect(() => {
    if (!filtreNom && !filtrePrenom && !filtreClasse) { setRechercheIndividuelle([]); return; }
    const timer = setTimeout(async () => {
      let query = supabase.from('students')
        .select('matricule, nom, prenom, classe')
        .order('classe').order('nom').limit(10);
      if (filtreNom)    query = query.ilike('nom',    `%${filtreNom}%`);
      if (filtrePrenom) query = query.ilike('prenom', `%${filtrePrenom}%`);
      if (filtreClasse) query = query.ilike('classe', `%${filtreClasse}%`);
      const { data } = await query;
      setRechercheIndividuelle(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtreNom, filtrePrenom, filtreClasse]);

  const toggleClasse = (v: string) =>
    setClassesSelectionnees(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleGroupe = (v: string) =>
    setGroupesSelectionnes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const toggleEleveIndividuel = useCallback((eleve: Student) => {
    setElevesIndividuels(prev =>
      prev.some(e => e.matricule === eleve.matricule)
        ? prev.filter(e => e.matricule !== eleve.matricule)
        : [...prev, eleve]
    );
  }, []);

  const retirerEleve = (matricule: number) => {
    if (elevesIndividuels.some(e => e.matricule === matricule)) {
      setElevesIndividuels(prev => prev.filter(e => e.matricule !== matricule));
    } else {
      setExclus(prev => prev.indexOf(matricule) === -1 ? [...prev, matricule] : prev);
    }
  };

  const viderTousLesEleves = () => {
    setClassesSelectionnees([]);
    setGroupesSelectionnes([]);
    setElevesIndividuels([]);
    setExclus([]);
  };

  const toggleEmployee = (id: string) =>
    setAccesEmployees(prev =>
      prev.find(e => e.id === id) ? prev.filter(e => e.id !== id) : [...prev, { id, role: 'observateur' }]
    );
  const setRoleEmployee = (id: string, role: 'responsable' | 'observateur') =>
    setAccesEmployees(prev => prev.map(e => e.id === id ? { ...e, role } : e));

  const creerProjet = async () => {
    if (!nom.trim()) return;
    setSaving(true);
    try {
      const { data: projet, error } = await supabase.from('projets').insert({
        nom: nom.trim(),
        description: description.trim() || null,
        dashboard,
        consignes: consignes.trim() || null,
        mode_sources: modeSource,
        max_sources_par_eleve: maxSources !== '' ? maxSources : null,
        created_by: userId,
        statut: 'brouillon',
      }).select().single();
      if (error || !projet) throw error;

      const matricules = elevesSelectionnes.map(e => e.matricule);
      if (matricules.length > 0) {
        await supabase.from('projet_eleves').insert(
          matricules.map(matricule => ({ projet_id: projet.id, matricule }))
        );
      }

      if (accesEmployees.length > 0) {
        await supabase.from('projet_acces_employees').insert(
          accesEmployees.map(e => ({ projet_id: projet.id, employee_id: e.id, role: e.role, added_by: userId }))
        );
      }

      router.push(`/tools/projets/${projet.id}`);
    } catch (err) {
      console.error('Erreur création projet:', err);
      alert('Erreur lors de la création. Vérifiez la console.');
    } finally {
      setSaving(false);
    }
  };

  const employeesFiltres = employees.filter(e => {
    const q = rechercheEmployee.toLowerCase();
    return !q || e.nom.toLowerCase().includes(q) || (e.prenom || '').toLowerCase().includes(q);
  });

  // Helpers pour le style partiel des boutons
  const classeEstPartielle = (c: string) =>
    classesSelectionnees.includes(c) &&
    elevesParClasse.filter(e => e.classe === c).some(e => exclus.includes(e.matricule));

  // Pour les groupes : partiel si au moins un élève du groupe est exclu
  // (on ne peut pas filtrer par groupe_code directement depuis elevesParGroupe,
  //  donc on considère partiel si groupeSelectionné ET exclus.length > 0)
  const groupeEstPartiel = (g: string) =>
    groupesSelectionnes.includes(g) && exclus.length > 0;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau projet</h1>
          <p className="text-sm text-gray-500">Configuration initiale</p>
        </div>
      </div>

      {/* Navigation steps */}
      <div className="flex items-center gap-2 mb-8">
        {['Infos générales', 'Élèves ciblés', 'Équipe'].map((label, i) => (
          <button key={i} onClick={() => setStep(i + 1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              step === i + 1 ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-600'
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1 ? 'bg-green-500 text-white' :
              step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <StepHeader n={1} label="Informations générales" active done={false} />
          <div className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet <span className="text-red-500">*</span></label>
              <input value={nom} onChange={e => setNom(e.target.value)}
                placeholder="ex: Sessions Parlementaires — Énergie 2025"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Brève description pour le dashboard"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard d'accès pour les élèves</label>
              <div className="flex gap-3">
                {(['principal', 'sciences'] as const).map(d => (
                  <button key={d} onClick={() => setDashboard(d)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition ${
                      dashboard === d ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {d === 'principal' ? '🏠 Dashboard principal' : '🔬 Dashboard sciences'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consignes générales</label>
              <textarea value={consignes} onChange={e => setConsignes(e.target.value)} rows={4}
                placeholder="Cadre du projet, instructions générales pour les élèves…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode de gestion des sources bibliographiques</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { value: 'consultation_seule', label: 'Consultation seule', desc: 'Les élèves consultent sans choisir' },
                  { value: 'unique', label: 'Source unique', desc: 'Chaque élève choisit une source (même choix possible)' },
                  { value: 'differentes', label: 'Sources différentes', desc: 'Chaque source ne peut être prise que par un élève' },
                  { value: 'libre', label: 'Libre', desc: 'Les élèves choisissent librement (plusieurs possibles)' },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setModeSource(opt.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border-2 transition ${
                      modeSource === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <p className={`text-sm font-medium ${modeSource === opt.value ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {modeSource === 'libre' && (
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm text-gray-600">Max. sources par élève :</label>
                  <input type="number" min={1} value={maxSources}
                    onChange={e => setMaxSources(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="illimité"
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => setStep(2)} disabled={!nom.trim()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Suivant
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <StepHeader n={2} label="Élèves ciblés" active done={false} />
          <div className="space-y-8">

            {/* Classes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Classes
                {classesSelectionnees.length > 0 && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {classesSelectionnees.length} sélectionnée{classesSelectionnees.length > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <input value={rechercheClasse} onChange={e => setRechercheClasse(e.target.value)}
                placeholder="Filtrer les classes…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {classesDisponibles
                  .filter(c => c.value.toLowerCase().includes(rechercheClasse.toLowerCase()))
                  .map(c => {
                    const sel = classesSelectionnees.includes(c.value);
                    const partiel = classeEstPartielle(c.value);
                    return (
                      <button key={c.value} onClick={() => toggleClasse(c.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border-2 ${
                          sel && !partiel ? 'bg-green-500 text-white border-green-500' :
                          sel && partiel  ? 'bg-white text-green-700 border-green-500' :
                          'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
                        }`}>
                        {c.label}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Groupes pédagogiques */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Groupes pédagogiques
                {groupesSelectionnes.length > 0 && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {groupesSelectionnes.length} sélectionné{groupesSelectionnes.length > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <input value={rechercheGroupe} onChange={e => setRechercheGroupe(e.target.value)}
                placeholder="Filtrer les groupes…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {groupesDisponibles
                  .filter(g => g.value.toLowerCase().includes(rechercheGroupe.toLowerCase()))
                  .map(g => {
                    const sel = groupesSelectionnes.includes(g.value);
                    const partiel = groupeEstPartiel(g.value);
                    return (
                      <button key={g.value} onClick={() => toggleGroupe(g.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border-2 ${
                          sel && !partiel ? 'bg-blue-500 text-white border-blue-500' :
                          sel && partiel  ? 'bg-white text-blue-700 border-blue-500' :
                          'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                        }`}>
                        {g.label}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Recherche individuelle */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Ajouter des élèves individuellement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <input type="text" placeholder="Nom" value={filtreNom} onChange={e => setFiltreNom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input type="text" placeholder="Prénom" value={filtrePrenom} onChange={e => setFiltrePrenom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input type="text" placeholder="Classe" value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              {rechercheIndividuelle.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 border-b">
                    {rechercheIndividuelle.length} résultat{rechercheIndividuelle.length > 1 ? 's' : ''}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {rechercheIndividuelle.map(eleve => (
                      <label key={eleve.matricule}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer">
                        <input type="checkbox"
                          checked={elevesIndividuels.some(e => e.matricule === eleve.matricule)}
                          onChange={() => toggleEleveIndividuel(eleve)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{eleve.nom} {eleve.prenom}</span>
                          <span className="ml-2 text-xs text-gray-500">{eleve.classe}</span>
                        </div>
                        <span className="text-xs text-gray-400">#{eleve.matricule}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Récapitulatif */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Élèves sélectionnés
                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {elevesSelectionnes.length}
                  </span>
                </h3>
                {elevesSelectionnes.length > 0 && (
                  <button onClick={viderTousLesEleves} className="text-xs text-red-600 hover:text-red-700 font-medium">
                    Tout vider
                  </button>
                )}
              </div>

              {(classesSelectionnees.length > 0 || groupesSelectionnes.length > 0 || elevesIndividuels.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  {classesSelectionnees.length > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      📚 Classes : {classesSelectionnees.length}
                    </span>
                  )}
                  {groupesSelectionnes.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      👥 Groupes : {groupesSelectionnes.length}
                    </span>
                  )}
                  {elevesIndividuels.length > 0 && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      ✨ Individuels : {elevesIndividuels.length}
                    </span>
                  )}
                  {exclus.length > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                      ✕ Exclus : {exclus.length}
                    </span>
                  )}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1">
                {elevesSelectionnes.map(eleve => (
                  <div key={eleve.matricule}
                    className="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-gray-100 hover:border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{eleve.nom} {eleve.prenom}</span>
                      <span className="text-xs text-gray-400">{eleve.classe}</span>
                    </div>
                    <button onClick={() => retirerEleve(eleve.matricule)}
                      className="text-gray-300 hover:text-red-500 transition text-xs px-1" title="Retirer">✕</button>
                  </div>
                ))}
                {elevesSelectionnes.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Aucun élève sélectionné. Utilisez les sections ci-dessus pour en ajouter.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <button onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm">
              Suivant
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <StepHeader n={3} label="Équipe pédagogique (optionnel)" active done={false} />
          <p className="text-sm text-gray-500 mb-4">
            Ajoutez des collègues comme <strong>observateurs</strong> (consultation) ou <strong>co-responsables</strong> (édition).
          </p>

          <div className="relative mb-4">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={rechercheEmployee} onChange={e => setRechercheEmployee(e.target.value)}
              placeholder="Rechercher un collègue…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto mb-4">
            {employeesFiltres.map(emp => {
              const sel = accesEmployees.find(e => e.id === emp.id);
              return (
                <div key={emp.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition cursor-pointer ${
                    sel ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => toggleEmployee(emp.id)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      sel ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {sel ? '✓' : (emp.nom[0] || '?')}
                    </div>
                    <span className="text-sm text-gray-800">{emp.nom} {emp.prenom || emp.initiale}</span>
                  </div>
                  {sel && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {(['observateur', 'responsable'] as const).map(r => (
                        <button key={r} onClick={() => setRoleEmployee(emp.id, r)}
                          className={`px-2 py-0.5 text-xs rounded-full font-medium transition ${
                            sel.role === r
                              ? r === 'responsable' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                          {r === 'responsable' ? 'Co-responsable' : 'Observateur'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {accesEmployees.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Récapitulatif ({accesEmployees.length}) :</p>
              <div className="flex flex-wrap gap-1.5">
                {accesEmployees.map(a => {
                  const emp = employees.find(e => e.id === a.id);
                  return (
                    <span key={a.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.role === 'responsable' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {emp?.nom} · {a.role === 'responsable' ? 'Co-resp.' : 'Obs.'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 mb-6">
            <h3 className="text-sm font-semibold text-indigo-800 mb-2">Récapitulatif du projet</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Nom :</dt><dd className="text-gray-900 font-medium">{nom}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Dashboard :</dt><dd className="text-gray-900">{dashboard === 'principal' ? 'Principal' : 'Sciences'}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Élèves ciblés :</dt><dd className="text-gray-900">{elevesSelectionnes.length} élève{elevesSelectionnes.length > 1 ? 's' : ''}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-28 flex-shrink-0">Sources :</dt><dd className="text-gray-900">{modeSource.replace('_', ' ')}</dd></div>
            </dl>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <button onClick={creerProjet} disabled={saving || !nom.trim() || elevesSelectionnes.length === 0}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Création…</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>Créer le projet</>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}