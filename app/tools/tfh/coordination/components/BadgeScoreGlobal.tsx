// app/tools/tfh/coordination/components/BadgeScoreGlobal.tsx
'use client';

interface BadgeScoreGlobalProps {
  nbVerts: number;
  nbEvaluables: number;
}

export default function BadgeScoreGlobal({ nbVerts, nbEvaluables }: BadgeScoreGlobalProps) {
  // Cas : aucune évaluation possible
  if (nbEvaluables === 0) {
    return (
      <span className="inline-block px-2 py-1 rounded-md text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200">
        —
      </span>
    );
  }

  const ratio = nbVerts / nbEvaluables;

  let bg = 'bg-red-50', text = 'text-red-700', border = 'border-red-200';
  if (ratio === 1) { bg = 'bg-green-50'; text = 'text-green-700'; border = 'border-green-200'; }
  else if (ratio >= 2/3) { bg = 'bg-yellow-50'; text = 'text-yellow-700'; border = 'border-yellow-200'; }
  else if (ratio >= 1/3) { bg = 'bg-orange-50'; text = 'text-orange-700'; border = 'border-orange-200'; }

  return (
    <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold border ${bg} ${text} ${border}`}>
      {nbVerts}/{nbEvaluables}
    </span>
  );
}