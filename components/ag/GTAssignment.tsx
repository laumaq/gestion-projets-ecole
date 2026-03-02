// components/ag/GTAssignment.tsx
'use client';

import { useState } from 'react';
import { Employee, GT } from '@/hooks/useAGData';

interface GTAssignmentProps {
  employees: Employee[];
  groupes: GT[];
  onAssign: (employeeId: string, groupeId: string | null) => Promise<void>;
}

export default function GTAssignment({ employees, groupes, onAssign }: GTAssignmentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // Filtrer les employés (uniquement profs ? ou tous ?)
  const filteredEmployees = employees.filter(emp => 
    emp.job === 'prof' && // Seulement les profs ?
    (emp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
     emp.prenom.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssign = async (employeeId: string, groupeId: string | null) => {
    setUpdating(employeeId);
    await onAssign(employeeId, groupeId);
    setUpdating(null);
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

      {/* Recherche */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un professeur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* Liste des GT */}
      <div className="space-y-6">
        {groupes.map((groupe) => (
          <div key={groupe.id} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-medium text-gray-900">{groupe.nom}</h4>
            </div>
            <div className="divide-y">
              {employeesByGT[groupe.id]?.employees.length > 0 ? (
                employeesByGT[groupe.id].employees.map((emp) => (
                  <div key={emp.id} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {emp.prenom} {emp.nom}
                    </span>
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
                  Aucun professeur dans ce GT
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
            <div className="divide-y">
              {sansGT.map((emp) => (
                <div key={emp.id} className="px-4 py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {emp.prenom} {emp.nom}
                  </span>
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
