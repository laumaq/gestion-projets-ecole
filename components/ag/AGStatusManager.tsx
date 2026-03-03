// components/ag/AGStatusManager.tsx
'use client';

interface AGStatusManagerProps {
  currentStatus: 'preparation' | 'planning_etabli';
  onStatusChange: (newStatus: 'preparation' | 'planning_etabli') => Promise<void>;
  isUpdating: boolean;
}

export default function AGStatusManager({ currentStatus, onStatusChange, isUpdating }: AGStatusManagerProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Statut de l'AG</h3>
      
      <div className="flex items-center space-x-6">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Statut actuel :</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              currentStatus === 'preparation' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {currentStatus === 'preparation' ? 'En préparation' : 'Planning établi'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {currentStatus === 'preparation' 
              ? 'Les employés peuvent soumettre leurs demandes de temps'
              : 'Le planning est figé et visible par tous'}
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => onStatusChange('preparation')}
            disabled={currentStatus === 'preparation' || isUpdating}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentStatus === 'preparation'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            Passer en préparation
          </button>
          <button
            onClick={() => onStatusChange('planning_etabli')}
            disabled={currentStatus === 'planning_etabli' || isUpdating}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentStatus === 'planning_etabli'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            Passer au planning établi
          </button>
        </div>
      </div>
    </div>
  );
}
