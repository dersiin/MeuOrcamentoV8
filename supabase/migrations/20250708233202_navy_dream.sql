/*
  # Adicionar campo forma_pagamento aos lançamentos

  1. Alterações na tabela lancamentos
    - Adicionar coluna `forma_pagamento` (DEBITO, CREDITO)
    - Atualizar constraint para remover CARTAO_CREDITO do tipo de conta

  2. Atualizar constraint de contas
    - Remover CARTAO_CREDITO como tipo de conta válido
*/

-- Adicionar coluna forma_pagamento aos lançamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lancamentos' AND column_name = 'forma_pagamento'
  ) THEN
    ALTER TABLE lancamentos ADD COLUMN forma_pagamento text CHECK (forma_pagamento IN ('DEBITO', 'CREDITO'));
  END IF;
END $$;

-- Atualizar dados existentes: se tem cartao_credito_usado, é CREDITO, senão é DEBITO
UPDATE lancamentos 
SET forma_pagamento = CASE 
  WHEN cartao_credito_usado IS NOT NULL THEN 'CREDITO'
  ELSE 'DEBITO'
END
WHERE forma_pagamento IS NULL;

-- Tornar o campo obrigatório para despesas
ALTER TABLE lancamentos 
ADD CONSTRAINT check_forma_pagamento_despesa 
CHECK (
  tipo = 'RECEITA' OR 
  (tipo = 'DESPESA' AND forma_pagamento IS NOT NULL)
);

-- Atualizar constraint de tipos de conta (remover CARTAO_CREDITO)
ALTER TABLE contas DROP CONSTRAINT IF EXISTS contas_tipo_check;
ALTER TABLE contas ADD CONSTRAINT contas_tipo_check 
CHECK (tipo IN ('CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA'));

-- Converter contas existentes do tipo CARTAO_CREDITO para CORRENTE
UPDATE contas 
SET tipo = 'CORRENTE' 
WHERE tipo = 'CARTAO_CREDITO';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_forma_pagamento ON lancamentos(forma_pagamento);