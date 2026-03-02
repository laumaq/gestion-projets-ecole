// components/ag/BureauManagement.tsx
'use client';

import { useState } from 'react';
import { Bureau, Employee } from '@/hooks/useAGData';

interface BureauManagementProps {
  bureau: Bureau[];
  employees: Employee[];
  onAdd: (employeeId: string, role: 'maitre_du_temps' | 'animateur') => Promise<void>;
  onRemove: (bureauId: string) => Promise<void>;
}

export default function BureauManagement({ bureau, employees, onAdd, onRemove }: BureauManagementProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState<'maitre_du_temps' | 'animateur'>('maitre_du_temps');
  const [isAdding, setIsAdding] = useState(false);

  // Filtrer les employés qui ne sont pas déjà au bureau
  const availableEmployees = employees.filter(
    emp => !bureau.some(b => b.employee_id === emp.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setIsAdding(true);
    await onAdd(selectedEmployee, selectedRole);
    setSelectedEmployee('');
    setSelectedRole('maitre_du_temps');
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Bureau de l'AG</h3>
      
      {/* Liste des membres actuels */}
      <div className="space-y-2 mb-6">
        {bureau.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucun membre du bureau désigné</p>
        ) : (
          bureau.map((membre) => (
            <div key={membre.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {membre.prenom} {membre.nom}
                </p>
                <p className="text-xs text-gray-500">
                  {membre.role === 'maitre_du_temps' ? '🕐 Maître du temps' : '🎤 Animateur'}
                </p>
              </div>
              <button
                onClick={() => onRemove(membre.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Retirer
              </button>
            </div>
          ))
        )}
      </div>

      {/* Formulaire d'ajout */}
      <form onSubmit={handleSubmit} className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Ajouter un membre</h4>
        <div className="space-y-3">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            required
          >
            <option value="">Sélectionner un employé</option>
            {availableEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.prenom} {emp.nom} ({emp.job})
              </option>
            ))}
          </select>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setSelectedRole('maitre_du_temps')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                selectedRole === 'maitre_du_temps'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🕐 Maître du temps
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('animateur')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                selectedRole === 'animateur'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎤 Animateur
            </button>
          </div>

          <button
            type="submit"
            disabled={!selectedEmployee || isAdding}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Ajout...' : 'Ajouter au bureau'}
          </button>
        </div>
      </form>
    </div>
  );
}
