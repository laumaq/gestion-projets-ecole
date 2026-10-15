'use client';

import { TfhDocumentRecipient } from '../hooks/useDocumentsCRUD';

type TargetingMode = 'tous' | 'types' | 'eleves';

interface TargetingFieldsProps {
  aRendre: boolean;
  mode: TargetingMode;
  selectedTypes: string[];
  selectedMatricules: number[];
  recipients: TfhDocumentRecipient[];
  onChange: (value: {
    aRendre: boolean;
    mode: TargetingMode;
    selectedTypes: string[];
    selectedMatricules: number[];
  }) => void;
}

export default function TargetingFields({
  aRendre,
  mode,
  selectedTypes,
  selectedMatricules,
  recipients,
  onChange,
}: TargetingFieldsProps) {
  const availableTypes = Array.from(new Set(recipients.map(student => student.type).filter(Boolean))).sort();

  const setMode = (nextMode: TargetingMode) => {
    onChange({
      aRendre: true,
      mode: nextMode,
      selectedTypes,
      selectedMatricules: nextMode === 'tous'
        ? recipients.map(student => student.student_matricule)
        : nextMode === 'types'
          ? recipients
              .filter(student => selectedTypes.includes(student.type))
              .map(student => student.student_matricule)
          : selectedMatricules,
    });
  };

  const toggleType = (type: string) => {
    const nextTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(item => item !== type)
      : [...selectedTypes, type];
    onChange({
      aRendre: true,
      mode,
      selectedTypes: nextTypes,
      selectedMatricules: recipients
        .filter(student => nextTypes.includes(student.type))
        .map(student => student.student_matricule),
    });
  };

  const toggleStudent = (matricule: number) => {
    const nextStudents = selectedMatricules.includes(matricule)
      ? selectedMatricules.filter(item => item !== matricule)
      : [...selectedMatricules, matricule];
    onChange({
      aRendre: true,
      mode,
      selectedTypes,
      selectedMatricules: nextStudents,
    });
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          checked={aRendre}
          onChange={event => {
            const enabled = event.target.checked;
            onChange({
              aRendre: enabled,
              mode: enabled ? mode : 'tous',
              selectedTypes: enabled ? selectedTypes : [],
              selectedMatricules: !enabled
                ? []
                : mode === 'tous'
                  ? recipients.map(student => student.student_matricule)
                  : mode === 'types'
                    ? recipients
                        .filter(student => selectedTypes.includes(student.type))
                        .map(student => student.student_matricule)
                    : selectedMatricules,
            });
          }}
          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
        />
        Ce document doit être rendu rempli
      </label>

      {aRendre && (
        <>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Qui doit le rendre ?</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {([
                ['tous', 'Tous les élèves TFH'],
                ['types', 'Certains types de TFH'],
                ['eleves', 'Élèves à sélectionner'],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="mode-ciblage-document"
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    className="border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {mode === 'types' && (
            <div className="flex flex-wrap gap-2">
              {availableTypes.length === 0 ? (
                <p className="text-xs text-gray-500">Aucun type de TFH disponible.</p>
              ) : availableTypes.map(type => (
                <label key={type} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  {type}
                </label>
              ))}
            </div>
          )}

          {mode === 'eleves' && (
            <div className="max-h-52 overflow-y-auto rounded border border-gray-200 bg-white divide-y divide-gray-100">
              {recipients.map(student => (
                <label key={student.student_matricule} className="flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedMatricules.includes(student.student_matricule)}
                    onChange={() => toggleStudent(student.student_matricule)}
                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="font-medium text-gray-800">{student.prenom} {student.nom}</span>
                  <span className="text-gray-500">{student.classe} · {student.type || 'Type non défini'}</span>
                </label>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600">
            {selectedMatricules.length} élève{selectedMatricules.length === 1 ? '' : 's'} sélectionné{selectedMatricules.length === 1 ? '' : 's'}.
          </p>
        </>
      )}
    </div>
  );
}
