// /app/admin/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Student {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  email?: string;
}

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  job?: string;
  email?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'student' | 'employee'>('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est admin (UUID spécifique)
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    setCurrentUserId(userId);
    
    // Liste des UUID autorisés (à remplacer par les vrais)
    const adminUUIDs = ['52793bea-994a-4b50-b768-75427df4747b','a06b22ec-11f6-49a7-ab8a-13607ff2ac87']; // À remplacer par ton UUID
    
    if (userType !== 'employee' || !adminUUIDs.includes(userId || '')) {
      router.push('/dashboard');
      return;
    }
    
    setIsAdmin(true);
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    await loadStudents();
    await loadEmployees();
    setLoading(false);
  };

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('matricule, nom, prenom, classe')
      .order('classe')
      .order('nom')
      .order('prenom');
    
    if (data) setStudents(data);
  };

  const getJobLabel = (job: string | undefined): string => {
    switch (job) {
      case 'direction': return 'Direction';
      case 'administration': return 'Administratif·ve';
      case 'educ': return 'Éducateur·trice';
      case 'prof': return 'Professeur·e';
      default: return job || 'Personnel';
    }
  };  

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, nom, prenom, job, email')
      .order('nom')
      .order('prenom');
    
    if (error) {
      console.error('Erreur chargement employees:', error);
      return;
    }
    
    if (data) {
      // Ordre de tri personnalisé pour les jobs
      const jobOrder: { [key: string]: number } = {
        'direction': 1,
        'administration': 2,
        'educ': 3,
        'prof': 4,
        '': 5
      };
      
      // Trier les employés selon l'ordre des jobs, puis par nom, puis par prénom
      const sortedEmployees = [...data].sort((a, b) => {
        const orderA = jobOrder[a.job || ''] || 99;
        const orderB = jobOrder[b.job || ''] || 99;
        if (orderA !== orderB) return orderA - orderB;
        if (a.nom !== b.nom) return a.nom.localeCompare(b.nom);
        return a.prenom.localeCompare(b.prenom);
      });
      
      setEmployees(sortedEmployees);
    }
  };

  const resetPassword = async (id: string, type: 'student' | 'employee', name: string) => {
    const table = type === 'student' ? 'students' : 'employees';
    const idField = type === 'student' ? 'matricule' : 'id';
    
    if (confirm(`Voulez-vous vraiment réinitialiser le mot de passe de ${name} ?`)) {
      const { error } = await supabase
        .from(table)
        .update({ mot_de_passe: null })
        .eq(idField, id);
      
      if (error) {
        alert('Erreur lors de la réinitialisation');
        console.error(error);
      } else {
        alert(`Mot de passe réinitialisé pour ${name}`);
      }
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.nom} ${s.prenom} ${s.classe}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(e =>
    `${e.nom} ${e.prenom} ${e.job || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* En-tête */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Panneau d'administration</h1>
            <p className="text-sm text-gray-500 mt-1">Gestion des utilisateurs et réinitialisation des mots de passe</p>
          </div>

          {/* Toggle et recherche */}
          <div className="p-6 border-b">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setUserType('student')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                    userType === 'student'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  👨‍🎓 Élèves
                </button>
                <button
                  onClick={() => setUserType('employee')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                    userType === 'employee'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  👨‍🏫 Personnel
                </button>
              </div>

              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Liste des étudiants */}
          {userType === 'student' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prénom</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Aucun élève trouvé</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.matricule} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{student.classe}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{student.nom}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{student.prenom}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => resetPassword(student.matricule.toString(), 'student', `${student.prenom} ${student.nom}`)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                          >
                            Réinitialiser le mot de passe
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Liste des employés */}
          {userType === 'employee' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prénom</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Aucun employé trouvé</td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {getJobLabel(employee.job)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{employee.nom}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{employee.prenom}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => resetPassword(employee.id, 'employee', `${employee.prenom} ${employee.nom} (${getJobLabel(employee.job)})`)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                          >
                            Réinitialiser le mot de passe
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer avec stats */}
          <div className="p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              {userType === 'student' 
                ? `${filteredStudents.length} élève${filteredStudents.length > 1 ? 's' : ''}`
                : `${filteredEmployees.length} employé${filteredEmployees.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}