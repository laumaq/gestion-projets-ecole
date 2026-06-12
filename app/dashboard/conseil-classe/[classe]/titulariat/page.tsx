// app/dashboard/conseil-classe/[classe]/titulariat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Save, Users, UserCheck, ChevronLeft, RefreshCw } from 'lucide-react';

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  job: string;
}

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
}

export default function ConseilClasseTitulariatPage() {
  const params = useParams();
  const router = useRouter();
  const classeNom = decodeURIComponent(params.classe as string);
  const anneeScolaire = '2024-2025';
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [titulaireId, setTitulaireId] = useState<string>('');
  const [coTitulaireId, setCoTitulaireId] = useState<string>('');
  const [presidentMatricule, setPresidentMatricule] = useState<string>('');
  const [secretaireMatricule, setSecretaireMatricule] = useState<string>('');
  const [delegueVoyageMatricule, setDelegueVoyageMatricule] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Charger les employés (profs et éducs)
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, nom, prenom, job')
        .in('job', ['prof', 'educ'])
        .order('nom');

      if (!employeesError) {
        setEmployees(employeesData || []);
      }

      // 2. Charger les élèves de la classe
      const { data: elevesData, error: elevesError } = await supabase
        .from('students')
        .select('matricule, nom, prenom')
        .eq('classe', classeNom)
        .order('nom');

      if (!elevesError) {
        setEleves(elevesData || []);
      }

      // 3. Charger les rôles existants
      const { data: rolesData, error: rolesError } = await supabase
        .from('conseil_classes_roles')
        .select('*')
        .eq('annee_scolaire', anneeScolaire)
        .eq('classe_nom', classeNom)
        .maybeSingle();

      if (!rolesError && rolesData) {
        setTitulaireId(rolesData.titulaire_id || '');
        setCoTitulaireId(rolesData.co_titulaire_id || '');
        setPresidentMatricule(rolesData.president_matricule?.toString() || '');
        setSecretaireMatricule(rolesData.secretaire_matricule?.toString() || '');
        setDelegueVoyageMatricule(rolesData.delegue_voyage_matricule?.toString() || '');
      }

    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const sauvegarderRoles = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('conseil_classes_roles')
        .upsert({
          annee_scolaire: anneeScolaire,
          classe_nom: classeNom,
          titulaire_id: titulaireId || null,
          co_titulaire_id: coTitulaireId || null,
          president_matricule: presidentMatricule ? parseInt(presidentMatricule) : null,
          secretaire_matricule: secretaireMatricule ? parseInt(secretaireMatricule) : null,
          delegue_voyage_matricule: delegueVoyageMatricule ? parseInt(delegueVoyageMatricule) : null,
          updated_by: localStorage.getItem('userId'),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'annee_scolaire,classe_nom'
        });

      if (error) throw error;
      alert('Rôles mis à jour avec succès');
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classeNom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour au conseil
        </button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestion des rôles
            </h1>
            <p className="text-gray-600 mt-1">
              Classe {classeNom} - {anneeScolaire}
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-8">
          {/* Section Équipe pédagogique */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Équipe pédagogique</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titulaire
                </label>
                <select
                  value={titulaireId}
                  onChange={(e) => setTitulaireId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Non assigné --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.prenom} {emp.nom} ({emp.job})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Co-titulaire
                </label>
                <select
                  value={coTitulaireId}
                  onChange={(e) => setCoTitulaireId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Non assigné --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.prenom} {emp.nom} ({emp.job})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section Rôles élèves */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <Users className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Rôles des élèves</h2>
              <p className="text-xs text-gray-500 ml-2">(cumul possible sauf président/secrétaire)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👑 Président
                </label>
                <select
                  value={presidentMatricule}
                  onChange={(e) => setPresidentMatricule(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Non assigné --</option>
                  {eleves.map(eleve => (
                    <option key={eleve.matricule} value={eleve.matricule}>
                      {eleve.prenom} {eleve.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Secrétaire
                </label>
                <select
                  value={secretaireMatricule}
                  onChange={(e) => setSecretaireMatricule(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Non assigné --</option>
                  {eleves.map(eleve => (
                    <option key={eleve.matricule} value={eleve.matricule}>
                      {eleve.prenom} {eleve.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ✈️ Délégué aux voyages
                </label>
                <select
                  value={delegueVoyageMatricule}
                  onChange={(e) => setDelegueVoyageMatricule(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Non assigné --</option>
                  {eleves.map(eleve => (
                    <option key={eleve.matricule} value={eleve.matricule}>
                      {eleve.prenom} {eleve.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <div className="pt-6 border-t">
            <button
              onClick={sauvegarderRoles}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder tous les rôles'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}