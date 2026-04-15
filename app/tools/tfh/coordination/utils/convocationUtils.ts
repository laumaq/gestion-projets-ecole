// app/tools/tfh/coordination/utils/convocationUtils.ts

import { CONVOCATION_OPTIONS } from '../constants';

export function getConvocationColor(value: string): string {
  if (!value) return 'bg-gray-200 text-gray-700';
  
  if (value === 'Non, l\'élève atteint bien les objectifs') {
    return 'bg-green-100 text-green-800';
  }
  if (value === 'Oui, l\'élève n\'atteint pas les objectifs') {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (value === 'Oui, l\'élève n\'a pas avancé') {
    return 'bg-red-100 text-red-800';
  }
  if (value === 'Oui, l\'élève n\'a pas communiqué') {
    return 'bg-orange-100 text-orange-800';
  }
  
  if (value === 'false') return 'bg-gray-200 text-gray-700';
  if (value === 'true') return 'bg-green-100 text-green-800';
  
  return 'bg-gray-100 text-gray-600';
}

export function getConvocationLabel(value: string): string {
  if (!value) return 'Non défini';
  
  if (value === 'Non, l\'élève atteint bien les objectifs') {
    return 'Non - Objectifs atteints';
  }
  if (value === 'Oui, l\'élève n\'atteint pas les objectifs') {
    return 'Oui - Objectifs non atteints';
  }
  if (value === 'Oui, l\'élève n\'a pas avancé') {
    return 'Oui - Pas avancé';
  }
  if (value === 'Oui, l\'élève n\'a pas communiqué') {
    return 'Oui - Pas communiqué';
  }
  
  if (value === 'false') return 'Non';
  if (value === 'true') return 'Oui';
  
  return value;
}

export function getConvocationLabelShort(value: string): string {
  if (!value) return '?';
  
  if (value === 'Non, l\'élève atteint bien les objectifs') return 'Non - Objectifs ✓';
  if (value === 'Oui, l\'élève n\'atteint pas les objectifs') return 'Oui - Objectifs ✗';
  if (value === 'Oui, l\'élève n\'a pas avancé') return 'Oui - Avance ✗';
  if (value === 'Oui, l\'élève n\'a pas communiqué') return 'Oui - Communication ✗';
  
  if (value === 'false') return 'Non';
  if (value === 'true') return 'Oui';
  
  return value.length > 8 ? value.substring(0, 8) + '...' : value;
}

export const getPresenceStyles = (value: boolean | null | undefined) => {
  switch (value) {
    case null:
      return {
        bgColor: 'bg-gray-100',
        hoverColor: 'hover:bg-gray-200',
        textColor: 'text-gray-400',
        icon: '?',
        title: 'Non défini'
      };
    case true:
      return {
        bgColor: 'bg-green-100',
        hoverColor: 'hover:bg-green-200',
        textColor: 'text-green-600',
        icon: '✓',
        title: 'Présent'
      };
    case false:
      return {
        bgColor: 'bg-red-100',
        hoverColor: 'hover:bg-red-200',
        textColor: 'text-red-600',
        icon: '✗',
        title: 'Absent'
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        hoverColor: 'hover:bg-gray-200',
        textColor: 'text-gray-400',
        icon: '?',
        title: 'Non défini'
      };
  }
};

export const cyclePresenceState = (current: boolean | null): boolean | null => {
  if (current === null) return true;
  if (current === true) return false;
  return null;
};