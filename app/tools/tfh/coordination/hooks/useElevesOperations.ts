// app/tools/tfh/coordination/hooks/useElevesOperations.ts
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Fonction utilitaire pour cycler les états de présence
const cyclePresenceState = (current: boolean | null): boolean | null => {
  if (current === null) return true;
  if (current === true) return false;
  return null;
};

export function useElevesOperations(onRefresh?: () => void) {
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (
    studentMatricule: number,  // Changé: plus d'UUID mais matricule
    field: string, 
    value: string,
    onSuccess?: () => void
  ): Promise<void> => {
    try {
      setIsUpdating(true);
      
      const updateData: any = {};
      
      // Gérer spécialement les valeurs null/boolean
      if (value === 'null' || value === 'undefined') {
        updateData[field] = null;
      } else if (value === 'true' || value === 'false') {
        updateData[field] = value === 'true';
      } else {
        updateData[field] = value === '' ? null : value;
      }

      const { error } = await supabase
        .from('tfh_eleves')
        .update(updateData)
        .eq('student_matricule', studentMatricule);  // Changé: plus .eq('id')

      if (error) throw error;
      
      onSuccess?.();
      onRefresh?.();
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectUpdate = async (
    studentMatricule: number,  // Changé
    field: string, 
    value: string,
    onSuccess?: () => void
  ): Promise<void> => {
    return handleUpdate(studentMatricule, field, value, onSuccess);
  };

  const handlePresenceUpdate = async (
    studentMatricule: number,  // Changé
    field: string, 
    currentValue: boolean | null,
    onSuccess?: (newValue: boolean | null) => void
  ): Promise<void> => {
    const newValue = cyclePresenceState(currentValue);
    
    // Convertir en string pour Supabase
    let valueString: string;
    if (newValue === null) {
      valueString = 'null';
    } else if (newValue === true) {
      valueString = 'true';
    } else {
      valueString = 'false';
    }
    
    return handleUpdate(studentMatricule, field, valueString, () => {
      onSuccess?.(newValue);
    });
  };

  return {
    editingCell,
    setEditingCell,
    isUpdating,
    handleUpdate,
    handleSelectUpdate,
    handlePresenceUpdate
  };
}