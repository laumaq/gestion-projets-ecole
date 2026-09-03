// app/tools/tfh/coordination/tabs/ParametresTab/components/EditeurDescription.tsx
'use client';

import EditeurTexte from '@/components/EditeurTexte';

interface EditeurDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export default function EditeurDescription({ value, onChange, label }: EditeurDescriptionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <EditeurTexte
        value={value}
        onChange={onChange}
        placeholder="Saisissez la description..."
        hauteur="h-48"
        simple={false}
      />
    </div>
  );
}