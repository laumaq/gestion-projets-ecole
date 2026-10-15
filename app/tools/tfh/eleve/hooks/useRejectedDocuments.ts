'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface RejectedTfhDocument {
  id: string;
  nom: string;
}

export function useRejectedDocuments(matricule: number | null) {
  const [documents, setDocuments] = useState<RejectedTfhDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRejectedDocuments = useCallback(async () => {
    if (!matricule) {
      setDocuments([]);
      return;
    }
    setError(null);
    try {
      const { data: returns, error: returnsError } = await supabase
        .from('tfh_documents')
        .select('id, document_parent_id, validation_status, created_at')
        .eq('student_matricule', matricule)
        .not('document_parent_id', 'is', null)
        .order('created_at', { ascending: false });

      if (returnsError) throw returnsError;

      const latestByDocument = new Map<string, { id: string; validation_status: string | null }>();
      (returns || []).forEach(returned => {
        if (returned.document_parent_id && !latestByDocument.has(returned.document_parent_id)) {
          latestByDocument.set(returned.document_parent_id, {
            id: returned.id,
            validation_status: returned.validation_status,
          });
        }
      });

      const rejectedParentIds = Array.from(latestByDocument.entries())
        .filter(([, returned]) => returned.validation_status === 'rejected')
        .map(([documentId]) => documentId);

      if (rejectedParentIds.length === 0) {
        setDocuments([]);
        return;
      }

      const { data: parentDocuments, error: parentError } = await supabase
        .from('tfh_documents')
        .select('id, nom')
        .in('id', rejectedParentIds);

      if (parentError) throw parentError;
      setDocuments((parentDocuments || []).map(document => ({
        id: document.id,
        nom: document.nom,
      })));
    } catch (err) {
      console.error('Erreur chargement des documents rejetés:', err);
      setError('Impossible de vérifier le statut de tes documents.');
    }
  }, [matricule]);

  useEffect(() => {
    void loadRejectedDocuments();
  }, [loadRejectedDocuments]);

  return { documents, error, reload: loadRejectedDocuments };
}
