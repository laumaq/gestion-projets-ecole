// app/tools/tfh/eleve/tabs/vade-mecum/sections/Introduction.tsx
'use client';

export default function Introduction() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4 text-center font-bold text-sm shadow-md">
            TRADI
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-xl p-4 text-center font-bold text-sm shadow-md">
            ATELIER
          </div>
          <div className="bg-gradient-to-br from-violet-400 to-violet-500 text-white rounded-xl p-4 text-center font-bold text-sm shadow-md">
            STAGE
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 text-center font-bold text-sm shadow-md">
            CHEF-D'ŒUVRE
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            VADE-MECUM
          </h1>
          <p className="text-lg font-semibold text-indigo-600">
            Travaux de Fin d'Humanités
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Quatre formats, une seule pédagogie du travail d'inspiration Freinet
          </p>
        </div>

        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded">
          <p className="text-sm text-indigo-900 font-medium">
            Athénée communal Léonie de Waha
          </p>
          <p className="text-xs text-indigo-700">
            Pédagogie active type Freinet — Immersion précoce
          </p>
        </div>
      </div>
    </div>
  );
}