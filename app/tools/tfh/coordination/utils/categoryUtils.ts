// app/tools/tfh/coordination/utils/categoryUtils.ts

interface CategoryColor {
  bg: string;
  border: string;
  text: string;
}

export const getCategoryColor = (categorie: string): CategoryColor => {
  const colors: CategoryColor[] = [
    { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
    { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
    { bg: '#D1FAE5', border: '#34D399', text: '#065F46' },
    { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
    { bg: '#E0E7FF', border: '#A5B4FC', text: '#3730A3' },
    { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
    { bg: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E' },
    { bg: '#F3E8FF', border: '#D8B4FE', text: '#6B21A8' },
    { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' },
    { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
  ];
  
  if (!categorie || categorie === 'Non catégorisé') {
    return { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };
  }
  
  const hash = categorie.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % colors.length;
  
  return colors[index];
};