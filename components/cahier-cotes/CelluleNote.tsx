'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Cote } from '@/lib/cahier-cotes/types';
import { COTE_COLORS, coteToLabel, NULL_SENTINEL } from '@/lib/cahier-cotes/constants';

export interface CelluleNoteHandle {
  focus: () => void;
  startEditing: () => void;
}

interface CelluleNoteProps {
  value: Cote;
  onChange: (newValue: Cote) => void;
  onTabForward?: () => void;
  onEnterNextRow?: () => void;
  disabled?: boolean;
  isMobile: boolean;
}

export const CelluleNote = forwardRef<CelluleNoteHandle, CelluleNoteProps>(
  function CelluleNote(
    { value, onChange, onTabForward, onEnterNextRow, disabled = false, isMobile },
    ref
  ) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const label = coteToLabel(value);
    const colorClass = COTE_COLORS[value ?? 'null'] ?? COTE_COLORS['null'];

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (isMobile) {
          containerRef.current?.focus();
        } else {
          setIsEditing(true);
        }
      },
      startEditing: () => setIsEditing(true),
    }));

    useEffect(() => {
      if (isEditing) {
        setInputValue(label === '-' ? '' : label);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }, [isEditing, label]);

    // ─── Mode mobile : <select> ───
    if (isMobile) {
      return (
        <select
          ref={containerRef as any}
          value={value ?? NULL_SENTINEL}
          onChange={e => {
            const v = e.target.value;
            onChange(v === NULL_SENTINEL ? null : (v as Cote));
          }}
          disabled={disabled}
          className={`w-full h-full text-center border-0 rounded ${colorClass} cursor-pointer appearance-none`}
        >
          {[NULL_SENTINEL, 'NA', 'EC-', 'EC', 'EC+', 'A', 'CM', 'X'].map(c => (
            <option key={String(c)} value={String(c)}>
              {c === NULL_SENTINEL ? '-' : c}
            </option>
          ))}
        </select>
      );
    }

    // ─── Mode desktop : input ───
    const commit = (raw: string) => {
      const trimmed = raw.trim().toUpperCase();
      if (trimmed === '' || trimmed === '-') {
        onChange(null);
      } else if (['NA', 'EC-', 'EC', 'EC+', 'A', 'CM', 'X'].includes(trimmed)) {
        onChange(trimmed as Cote);
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        commit(inputValue);
        onTabForward?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        commit(inputValue);
        onEnterNextRow?.();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onBlur={() => commit(inputValue)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full h-full text-center border-2 border-blue-500 rounded bg-white outline-none ${colorClass}`}
          placeholder="-"
          maxLength={3}
        />
      );
    }

    return (
      <div
        ref={containerRef}
        onClick={() => !disabled && setIsEditing(true)}
        className={`w-full h-full flex items-center justify-center cursor-text ${colorClass} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {label}
      </div>
    );
  }
);