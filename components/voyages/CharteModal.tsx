// components/voyages/CharteModal.tsx
'use client';

import { useState, useEffect } from 'react';

interface Props {
  contenu: string;
  tempsLecture: number;
  peutAccepter: boolean;
  onAccepter: () => void;
  onRefuser: () => void;
}

export default function CharteModal({ contenu, tempsLecture, peutAccepter, onAccepter, onRefuser }: Props) {
  const [aScrollJusquaLaFin, setAScrollJusquaLaFin] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const estALaFin = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (estALaFin) {
      setAScrollJusquaLaFin(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl">
          <h2 className="text-2xl font-bold text-white">Charte du voyage</h2>
          <p className="text-blue-100 mt-1">
            Veuillez lire attentivement et accepter les conditions pour accéder à l'organisation du voyage
          </p>
        </div>

        {/* Contenu de la charte avec scroll */}
        <div 
          className="flex-1 overflow-y-auto p-6 prose prose-blue max-w-none"
          onScroll={handleScroll}
        >
          <div dangerouslySetInnerHTML={{ __html: contenu }} />
        </div>

        {/* Footer avec timer et boutons */}
        <div className="p-6 border-t bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">{tempsLecture}</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Temps de lecture</p>
                <p className="text-xs text-gray-500">
                  {peutAccepter 
                    ? "? Vous pouvez maintenant accepter" 
                    : "Veuillez lire la charte jusqu'au bout"}
                </p>
              </div>
            </div>

            {!aScrollJusquaLaFin && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <span>?</span> Faites défiler jusqu'en bas
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRefuser}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
            >
              Refuser
            </button>
            <button
              onClick={onAccepter}
              disabled={!peutAccepter || !aScrollJusquaLaFin}
              className={`flex-1 px-4 py-3 font-medium rounded-lg transition ${
                peutAccepter && aScrollJusquaLaFin
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              J'accepte la charte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}