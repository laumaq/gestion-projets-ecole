// components/ag/AGStatusBadge.tsx
'use client';

interface AGStatusBadgeProps {
  statut: 'pas_ag' | 'preparation' | 'planning_etabli';
}

export default function AGStatusBadge({ statut }: AGStatusBadgeProps) {
  const config = {
    pas_ag: {
      text: 'Pas d\'AG',
      className: 'bg-gray-100 text-gray-800'
    },
    preparation: {
      text: 'En préparation',
      className: 'bg-yellow-100 text-yellow-800'
    },
    planning_etabli: {
      text: 'Planning établi',
      className: 'bg-green-100 text-green-800'
    }
  };

  const { text, className } = config[statut];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}
