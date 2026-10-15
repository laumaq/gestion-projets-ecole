-- Add return-document tracking while keeping existing documents generic.
ALTER TABLE public.tfh_documents
  ADD COLUMN IF NOT EXISTS document_parent_id uuid
    REFERENCES public.tfh_documents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS a_rendre boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mode_ciblage text,
  ADD COLUMN IF NOT EXISTS types_tfh text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS destinataires_matricules integer[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tfh_documents_mode_ciblage_check'
      AND conrelid = 'public.tfh_documents'::regclass
  ) THEN
    ALTER TABLE public.tfh_documents
      ADD CONSTRAINT tfh_documents_mode_ciblage_check
      CHECK (mode_ciblage IS NULL OR mode_ciblage IN ('tous', 'types', 'eleves'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tfh_documents_parent_id_idx
  ON public.tfh_documents (document_parent_id);

CREATE INDEX IF NOT EXISTS tfh_documents_recipients_idx
  ON public.tfh_documents USING gin (destinataires_matricules);
