
// components/voyages/EditeurCharte.tsx
'use client';

import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Modules avec toutes les options (couleurs, alignement, etc.)
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],  // ? Couleurs et fonds
    [{ align: ['', 'center', 'right', 'justify'] }],  // ? Alignements
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean']
  ],
};

// Formats supportés
const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',  // ? Ajout des couleurs
  'align',                // ? Ajout de l'alignement
  'list', 'bullet', 'indent',
  'link'
];

export default function EditeurCharte({ value, onChange, placeholder }: Props) {
  return (
    <div className="bg-white border rounded-lg">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "Rédigez votre charte..."}
        className="h-96"
      />
    </div>
  );
}