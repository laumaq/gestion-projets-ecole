// components/EditeurTexte.tsx
'use client';
import { useState, useEffect, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false }) as any;

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hauteur?: string;
  simple?: boolean;
}

const modulesComplets = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: ['', 'center', 'right', 'justify'] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
};

const modulesSimples = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

const formats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'align',
  'list', 'bullet', 'indent', 'link',
];

// Composant interne mémoïsé : ne se re-rend pas quand le parent change
// car on lui passe une valeur locale, pas la valeur parent
const QuillInterne = memo(function QuillInterne({
  initialValue, onChange, placeholder, hauteur, simple
}: {
  initialValue: string;
  onChange: (v: string) => void;
  placeholder: string;
  hauteur: string;
  simple: boolean;
}) {
  const [val, setVal] = useState(initialValue);

  const handleChange = (content: string) => {
    setVal(content);
    onChange(content);
  };

  return (
    <ReactQuill
      theme="snow"
      value={val}
      onChange={handleChange}
      modules={simple ? modulesSimples : modulesComplets}
      formats={formats}
      placeholder={placeholder}
      className={hauteur}
    />
  );
});

export default function EditeurTexte({
  value, onChange, placeholder = 'Rédigez votre texte…', hauteur = 'h-64', simple = false
}: Props) {
  // La clé change uniquement quand on ouvre l'éditeur (valeur initiale différente)
  // ce qui force un remount propre avec le bon contenu
  const keyRef = useRef(value);

  return (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
      <QuillInterne
        key={keyRef.current}
        initialValue={value}
        onChange={onChange}
        placeholder={placeholder}
        hauteur={hauteur}
        simple={simple}
      />
    </div>
  );
}