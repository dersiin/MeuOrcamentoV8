/*
  # Add forma_pagamento column to lancamentos table

  1. New Columns
    - `forma_pagamento` (text, nullable)
      - Indicates payment method: 'DEBITO', 'CREDITO', 'PIX', 'DINHEIRO', 'TRANSFERENCIA'
      - Default value: 'DEBITO'

  2. Security
    - No RLS changes needed as the column is added to existing table with existing policies

  3. Changes
    - Add forma_pagamento column to lancamentos table
    - Add check constraint to ensure valid payment methods
    - Set default value for existing records
*/

-- Add the forma_pagamento column
ALTER TABLE public.lancamentos 
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'DEBITO';

-- Add check constraint for valid payment methods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lancamentos_forma_pagamento_check' 
    AND table_name = 'lancamentos'
  ) THEN
    ALTER TABLE public.lancamentos 
    ADD CONSTRAINT lancamentos_forma_pagamento_check 
    CHECK (forma_pagamento = ANY (ARRAY['DEBITO'::text, 'CREDITO'::text, 'PIX'::text, 'DINHEIRO'::text, 'TRANSFERENCIA'::text]));
  END IF;
END $$;