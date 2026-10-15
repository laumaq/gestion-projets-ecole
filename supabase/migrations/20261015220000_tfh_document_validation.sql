ALTER TABLE public.tfh_documents
  ADD COLUMN IF NOT EXISTS validation_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tfh_documents_validation_status_check'
      AND conrelid = 'public.tfh_documents'::regclass
  ) THEN
    ALTER TABLE public.tfh_documents
      ADD CONSTRAINT tfh_documents_validation_status_check
      CHECK (validation_status IS NULL OR validation_status IN ('pending', 'validated', 'rejected'));
  END IF;
END $$;

UPDATE public.tfh_documents
SET validation_status = 'pending'
WHERE document_parent_id IS NOT NULL
  AND validation_status IS NULL;
