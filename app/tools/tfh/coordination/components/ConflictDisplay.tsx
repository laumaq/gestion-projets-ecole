// app/tools/tfh/coordination/components/ConflictDisplay.tsx
'use client';

import { Conflict } from '../types';

interface ConflictDisplayProps {
  conflicts: Conflict[];
}

export default function ConflictDisplay({ conflicts }: ConflictDisplayProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-red-100 p-2 rounded-full">
          <span className="text-red-600 font-bold">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-red-800">
          Conflits détectés dans le planning
        </h3>
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
          {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <div 
            key={index} 
            className="bg-white border border-red-100 rounded-lg p-4 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                conflict.type === 'local' ? 'bg-purple-100 text-purple-600' :
                conflict.type === 'guide' ? 'bg-blue-100 text-blue-600' :
                'bg-yellow-100 text-yellow-600'
              }`}>
                {conflict.type === 'local' ? '📍' : '🧑‍🏫'}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">
                  {conflict.message}
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {conflict.conflictingDefenses.map((defense, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {defense.date} {defense.startTime}
                      </span>
                      <span className="font-medium">
                        {defense.elevePrenom} {defense.eleveNom}
                      </span>
                      <span className="text-gray-500">
                        • Local: {defense.location}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-red-200">
        <p className="text-sm text-red-700">
          <strong>Action requise :</strong> Ajustez les horaires ou les affectations pour résoudre ces conflits.
        </p>
      </div>
    </div>
  );
}