// app/tools/tfh/coordination/tabs/DocumentsTab/hooks/useDocumentsCRUD.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TfhDocument } from '../../../types';

const BUCKET = 'tfh-documents';
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

export interface DocumentUploadInput {
  nom: string;
  file: File;
  a_rendre: boolean;
  mode_ciblage: 'tous' | 'types' | 'eleves' | null;
  types_tfh: string[];
  destinataires_matricules: number[];
}

export interface DocumentUpdateInput {
  nom: string;
  file?: File; // si fourni → remplace le fichier
  a_rendre: boolean;
  mode_ciblage: 'tous' | 'types' | 'eleves' | null;
  types_tfh: string[];
  destinataires_matricules: number[];
}

export interface TfhDocumentRecipient {
  student_matricule: number;
  type: string;
  nom: string;
  prenom: string;
  classe: string;
}

export type TfhDocumentValidationStatus = 'pending' | 'validated' | 'rejected';

export function useDocumentsCRUD() {
  const [documents, setDocuments] = useState<TfhDocument[]>([]);
  const [recipients, setRecipients] = useState<TfhDocumentRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [{ data, error }, { data: students, error: studentsError }] = await Promise.all([
        supabase.from('tfh_documents').select('*').order('nom', { ascending: true }),
        supabase
          .from('tfh_eleves')
          .select('student_matricule, type, students!inner(nom, prenom, classe)')
          .order('student_matricule', { ascending: true }),
      ]);

      if (error) throw error;
      if (studentsError) throw studentsError;
      setDocuments((data as TfhDocument[]) || []);
      setRecipients((students || []).map((student: any) => ({
        student_matricule: student.student_matricule,
        type: student.type || '',
        nom: student.students?.nom || '',
        prenom: student.students?.prenom || '',
        classe: student.students?.classe || '',
      })));
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      setLoadError('Impossible de charger les documents et les élèves destinataires.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const buildStoragePath = (nomFichier: string) => {
    const timestamp = Date.now();
    const safe = nomFichier.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${timestamp}_${safe}`;
  };

  const uploadFileToStorage = async (file: File): Promise<{ url: string; path: string }> => {
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`Fichier trop volumineux (max 20 Mo). Taille : ${(file.size / 1024 / 1024).toFixed(2)} Mo.`);
    }

    const path = buildStoragePath(file.name);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: urlData.publicUrl, path };
  };

  const deleteFileFromStorage = async (url: string) => {
    try {
      // Extraire le path depuis l'URL publique
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return;
      const path = url.substring(idx + marker.length).split('?')[0];
      await supabase.storage.from(BUCKET).remove([path]);
    } catch (err) {
      console.warn('Erreur suppression fichier Storage (non bloquant):', err);
    }
  };

  const createDocument = useCallback(async (input: DocumentUploadInput) => {
    if (!input.nom.trim()) throw new Error('Le nom est obligatoire.');

    const { url } = await uploadFileToStorage(input.file);

    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

    const { data, error } = await supabase
      .from('tfh_documents')
      .insert({
        nom: input.nom.trim(),
        url,
        nom_fichier: input.file.name,
        taille_octets: input.file.size,
        mime_type: input.file.type || null,
        student_matricule: null,
        uploaded_by: userId,
        a_rendre: input.a_rendre,
        mode_ciblage: input.a_rendre ? input.mode_ciblage : null,
        types_tfh: input.a_rendre ? input.types_tfh : [],
        destinataires_matricules: input.a_rendre ? input.destinataires_matricules : [],
      })
      .select()
      .single();

    if (error) {
      // Rollback : supprimer le fichier uploadé
      await deleteFileFromStorage(url);
      throw error;
    }

    setDocuments(prev =>
      [...prev, data as TfhDocument].sort((a, b) => a.nom.localeCompare(b.nom))
    );

    return data as TfhDocument;
  }, []);

  const updateDocument = useCallback(async (id: string, input: DocumentUpdateInput) => {
    if (!input.nom.trim()) throw new Error('Le nom est obligatoire.');

    const existing = documents.find(d => d.id === id);
    if (!existing) throw new Error('Document introuvable.');

    let url = existing.url;
    let nom_fichier = existing.nom_fichier;
    let taille_octets = existing.taille_octets;
    let mime_type = existing.mime_type;
    let uploadedUrl: string | null = null;

    // Si un nouveau fichier est fourni → remplace l'ancien
    if (input.file) {
      const uploaded = await uploadFileToStorage(input.file);
      uploadedUrl = uploaded.url;
      url = uploaded.url;
      nom_fichier = input.file.name;
      taille_octets = input.file.size;
      mime_type = input.file.type || null;
    }

    const { data, error } = await supabase
      .from('tfh_documents')
      .update({
        nom: input.nom.trim(),
        url,
        nom_fichier,
        taille_octets,
        mime_type,
        a_rendre: input.a_rendre,
        mode_ciblage: input.a_rendre ? input.mode_ciblage : null,
        types_tfh: input.a_rendre ? input.types_tfh : [],
        destinataires_matricules: input.a_rendre ? input.destinataires_matricules : [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (uploadedUrl) await deleteFileFromStorage(uploadedUrl);
      throw error;
    }

    if (uploadedUrl) await deleteFileFromStorage(existing.url);

    setDocuments(prev =>
      prev
        .map(d => (d.id === id ? (data as TfhDocument) : d))
        .sort((a, b) => a.nom.localeCompare(b.nom))
    );

    return data as TfhDocument;
  }, [documents]);

  const updateRecipients = useCallback(async (id: string, matricules: number[]) => {
    const { data, error } = await supabase
      .from('tfh_documents')
      .update({
        destinataires_matricules: matricules,
        mode_ciblage: 'eleves',
        types_tfh: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setDocuments(prev => prev.map(document => document.id === id ? data as TfhDocument : document));
  }, []);

  const updateSubmissionStatus = useCallback(async (
    id: string,
    validationStatus: TfhDocumentValidationStatus
  ) => {
    const { data, error } = await supabase
      .from('tfh_documents')
      .update({
        validation_status: validationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setDocuments(prev => prev.map(document => document.id === id ? data as TfhDocument : document));
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    const existing = documents.find(d => d.id === id);
    if (!existing) throw new Error('Document introuvable.');

    const relatedDocuments = documents.filter(document =>
      document.id === id || document.document_parent_id === id
    );
    const { error } = await supabase.from('tfh_documents').delete().eq('id', id);
    if (error) throw error;

    for (const document of relatedDocuments) {
      await deleteFileFromStorage(document.url);
    }

    setDocuments(prev => prev.filter(d => d.id !== id && d.document_parent_id !== id));
  }, [documents]);

  return {
    documents,
    recipients,
    loading,
    loadError,
    reload: loadDocuments,
    createDocument,
    updateDocument,
    updateRecipients,
    updateSubmissionStatus,
    deleteDocument,
  };
}