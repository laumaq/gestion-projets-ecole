-- Script pour ajouter la colonne 'type' à la table tfh_eleves
-- 4 types possibles : mémoire, associatif, artistique, atelier
-- Par défaut : mémoire

-- 1. Ajouter la colonne avec contrainte CHECK et valeur par défaut
ALTER TABLE tfh_eleves
ADD COLUMN type TEXT
  CHECK (type IN ('mémoire', 'associatif', 'artistique', 'atelier'))
  DEFAULT 'mémoire';

-- 2. (Optionnel) Mettre à jour les TFH existants sans type vers 'mémoire'
-- (Déjà géré par le DEFAULT, mais explicite pour les lignes existantes)
UPDATE tfh_eleves
SET type = 'mémoire'
WHERE type IS NULL;

-- 3. (Optionnel) Ajouter un commentaire pour documentation
COMMENT ON COLUMN tfh_eleves.type IS 'Type de TFH : mémoire, associatif, artistique, atelier';

-- 4. Vérification
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tfh_eleves' 
  AND column_name = 'type';

-- 5. Vérifier les valeurs distinctes
SELECT DISTINCT type, COUNT(*) as count
FROM tfh_eleves
GROUP BY type;