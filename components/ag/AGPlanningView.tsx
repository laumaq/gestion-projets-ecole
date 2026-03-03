// components/ag/AGPlanningView.tsx
'use client';

interface AGPlanningViewProps {
  config: any;
  communications: any[];
  pauses: any[];
}

export default function AGPlanningView({ config, communications, pauses }: AGPlanningViewProps) {
  if (!config) {
    return <p className="text-gray-500">Aucune configuration AG</p>;
  }

  if (communications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune communication n'a encore été enregistrée.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Planning de l'AG</h3>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {new Date(config.date_ag).toLocaleDateString('fr-FR')} • {config.heure_debut} - {config.heure_fin}
        </p>
      </div>

      <div className="space-y-4">
        {communications.map((comm, index) => (
          <div key={comm.id} className="border-l-4 border-blue-500 pl-4 py-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{comm.groupe_nom}</h4>
              <span className="text-sm text-gray-500">{comm.temps_demande} min</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{comm.resume}</p>
            <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 rounded">
              {comm.type_communication}
            </span>
          </div>
        ))}
      </div>

      {pauses.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pauses</h4>
          <div className="space-y-2">
            {pauses.map((pause, index) => (
              <div key={pause.id} className="text-sm text-gray-600">
                Pause {index + 1} : {pause.duree} minutes
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
