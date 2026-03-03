// components/ag/GTAssignment.tsx
'use client';

import { useState } from 'react';

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  job: string;
  groupe_id: string | null;
  groupe_nom?: string;
}

interface GT {
  id: string;
  nom: string;
}

interface GTAssignmentProps {
  employees: Employee[];
  groupes: GT[];
  onAssign: (employeeId: string, groupeId: string | null) => Promise<void>;
}

export default function GTAssignment({ employees, groupes, onAssign }: GTAssignmentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJob, setFilterJob] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Obtenir la liste unique des jobs
  const jobs = ['all', ...new Set(employees.map(e => e.job))];

  // Filtrer les employés
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.prenom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJob = filterJob === 'all' || emp.job === filterJob;
    return matchesSearch && matchesJob;
  });

  const handleAssign = async (employeeId: string, groupeId: string | null) => {
    setUpdating(employeeId);
    setError(null);
    
    try {
      await onAssign(employeeId, groupeId);
    } catch (err) {
      setError('Erreur lors de l\'assignation');
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  // Grouper les employés par GT
  const employeesByGT = groupes.reduce((acc, groupe) => {
    acc[groupe.id] = {
      ...groupe,
      employees: filteredEmployees.filter(emp => emp.groupe_id === groupe.id)
    };
    return acc;
  }, {} as Record<string, { nom: string; employees: Employee[] }>);

  // Employés sans GT
  const sansGT = filteredEmployees.filter(emp => !emp.groupe_id);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Groupes de Travail</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Rechercher un employé..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        
        <select
          value={filterJob}
          onChange={(e) => setFilterJob(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {jobs.map(job => (
            <option key={job} value={job}>
              {job === 'all' ? 'Tous les emplois' : job}
            </option>
          ))}
        </select>
      </div>

      {/* Liste des GT */}
      <div className="space-y-6 max-h-[600px] overflow-y-auto">
        {groupes.map((groupe) => (
          <div key={groupe.id} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-medium text-gray-900">{groupe.nom}</h4>
            </div>
            <div className="divide-y">
              {employeesByGT[groupe.id]?.employees.length > 0 ? (
                employeesByGT[groupe.id].employees.map((emp) => (
                  <div key={emp.id} className="px-4 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600">
                        {emp.prenom} {emp.nom}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({emp.job})
                      </span>
                    </div>
                    <select
                      value={emp.groupe_id || ''}
                      onChange={(e) => handleAssign(emp.id, e.target.value || null)}
                      disabled={updating === emp.id}
                      className="text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Sélectionner un GT</option>
                      {groupes.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 italic">
                  Aucun employé dans ce GT
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Employés sans GT */}
        {sansGT.length > 0 && (
          <div className="border rounded-lg overflow-hidden border-yellow-200">
            <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
              <h4 className="font-medium text-yellow-800">Sans GT ⚠️</h4>
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {sansGT.map((emp) => (
                <div key={emp.id} className="px-4 py-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-600">
                      {emp.prenom} {emp.nom}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      ({emp.job})
                    </span>
                  </div>
                  <select
                    value={emp.groupe_id || ''}
                    onChange={(e) => handleAssign(emp.id, e.target.value || null)}
                    disabled={updating === emp.id}
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Sélectionner un GT</option>
                    {groupes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nom}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
