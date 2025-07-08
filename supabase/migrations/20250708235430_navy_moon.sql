/*
  # Correção completa da lógica financeira

  1. Corrige estrutura de contas e saldos
  2. Implementa lógica correta para cartão de crédito
  3. Adiciona triggers para cálculo automático de saldos
  4. Corrige campos obrigatórios e defaults
*/

-- Primeiro, vamos garantir que a coluna forma_pagamento existe e tem valores corretos
ALTER TABLE lancamentos 
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'DEBITO';

-- Atualizar registros existentes baseado na lógica atual
UPDATE lancamentos 
SET forma_pagamento = CASE 
  WHEN cartao_credito_usado IS NOT NULL AND cartao_credito_usado != '' THEN 'CREDITO'
  ELSE 'DEBITO'
END
WHERE forma_pagamento IS NULL OR forma_pagamento = '';

-- Garantir que despesas tenham forma_pagamento definida
UPDATE lancamentos 
SET forma_pagamento = 'DEBITO' 
WHERE tipo = 'DESPESA' AND (forma_pagamento IS NULL OR forma_pagamento = '');

-- Garantir que receitas tenham forma_pagamento como DEBITO (entrada na conta)
UPDATE lancamentos 
SET forma_pagamento = 'DEBITO' 
WHERE tipo = 'RECEITA' AND (forma_pagamento IS NULL OR forma_pagamento = '');

-- Adicionar constraint para forma_pagamento
ALTER TABLE lancamentos DROP CONSTRAINT IF EXISTS lancamentos_forma_pagamento_check;
ALTER TABLE lancamentos 
ADD CONSTRAINT lancamentos_forma_pagamento_check 
CHECK (forma_pagamento = ANY (ARRAY['DEBITO'::text, 'CREDITO'::text, 'PIX'::text, 'DINHEIRO'::text, 'TRANSFERENCIA'::text]));

-- Garantir que contas tenham saldo_atual inicializado
UPDATE contas 
SET saldo_atual = COALESCE(saldo_inicial, 0) 
WHERE saldo_atual IS NULL;

-- Função melhorada para atualizar saldo das contas
CREATE OR REPLACE FUNCTION update_conta_saldo()
RETURNS TRIGGER AS $$
DECLARE
  conta_origem_id uuid;
  conta_destino_id uuid;
  valor_operacao numeric;
  tipo_operacao text;
  forma_pagamento_operacao text;
BEGIN
  -- Determinar se é INSERT, UPDATE ou DELETE
  IF TG_OP = 'DELETE' THEN
    conta_origem_id := OLD.conta_id;
    conta_destino_id := OLD.conta_destino_id;
    valor_operacao := OLD.valor;
    tipo_operacao := OLD.tipo;
    forma_pagamento_operacao := OLD.forma_pagamento;
  ELSE
    conta_origem_id := NEW.conta_id;
    conta_destino_id := NEW.conta_destino_id;
    valor_operacao := NEW.valor;
    tipo_operacao := NEW.tipo;
    forma_pagamento_operacao := NEW.forma_pagamento;
  END IF;

  -- Só processar se o status for CONFIRMADO
  IF (TG_OP = 'DELETE' AND OLD.status = 'CONFIRMADO') OR 
     (TG_OP != 'DELETE' AND NEW.status = 'CONFIRMADO') THEN
    
    -- Para RECEITAS: sempre aumenta o saldo da conta
    IF tipo_operacao = 'RECEITA' THEN
      IF TG_OP = 'DELETE' THEN
        -- Reverter: diminuir saldo
        UPDATE contas 
        SET saldo_atual = saldo_atual - valor_operacao 
        WHERE id = conta_origem_id;
      ELSE
        -- Aplicar: aumentar saldo
        UPDATE contas 
        SET saldo_atual = saldo_atual + valor_operacao 
        WHERE id = conta_origem_id;
      END IF;
    
    -- Para DESPESAS: depende da forma de pagamento
    ELSIF tipo_operacao = 'DESPESA' THEN
      -- Se é DÉBITO: diminui o saldo da conta imediatamente
      IF forma_pagamento_operacao = 'DEBITO' OR forma_pagamento_operacao = 'PIX' OR forma_pagamento_operacao = 'DINHEIRO' THEN
        IF TG_OP = 'DELETE' THEN
          -- Reverter: aumentar saldo
          UPDATE contas 
          SET saldo_atual = saldo_atual + valor_operacao 
          WHERE id = conta_origem_id;
        ELSE
          -- Aplicar: diminuir saldo
          UPDATE contas 
          SET saldo_atual = saldo_atual - valor_operacao 
          WHERE id = conta_origem_id;
        END IF;
      END IF;
      -- Se é CRÉDITO: não altera saldo da conta (vai para fatura)
    END IF;

    -- Para transferências (conta_destino_id preenchida)
    IF conta_destino_id IS NOT NULL THEN
      IF TG_OP = 'DELETE' THEN
        -- Reverter transferência
        UPDATE contas SET saldo_atual = saldo_atual - valor_operacao WHERE id = conta_destino_id;
      ELSE
        -- Aplicar transferência
        UPDATE contas SET saldo_atual = saldo_atual + valor_operacao WHERE id = conta_destino_id;
      END IF;
    END IF;
  END IF;

  -- Para UPDATE, verificar mudança de status
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Se mudou de CONFIRMADO para outro status, reverter
    IF OLD.status = 'CONFIRMADO' AND NEW.status != 'CONFIRMADO' THEN
      IF OLD.tipo = 'RECEITA' THEN
        UPDATE contas SET saldo_atual = saldo_atual - OLD.valor WHERE id = OLD.conta_id;
      ELSIF OLD.tipo = 'DESPESA' AND (OLD.forma_pagamento = 'DEBITO' OR OLD.forma_pagamento = 'PIX' OR OLD.forma_pagamento = 'DINHEIRO') THEN
        UPDATE contas SET saldo_atual = saldo_atual + OLD.valor WHERE id = OLD.conta_id;
      END IF;
    -- Se mudou para CONFIRMADO de outro status, aplicar
    ELSIF OLD.status != 'CONFIRMADO' AND NEW.status = 'CONFIRMADO' THEN
      IF NEW.tipo = 'RECEITA' THEN
        UPDATE contas SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_id;
      ELSIF NEW.tipo = 'DESPESA' AND (NEW.forma_pagamento = 'DEBITO' OR NEW.forma_pagamento = 'PIX' OR NEW.forma_pagamento = 'DINHEIRO') THEN
        UPDATE contas SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_id;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_update_conta_saldo ON lancamentos;
CREATE TRIGGER trigger_update_conta_saldo
  AFTER INSERT OR UPDATE OR DELETE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_conta_saldo();

-- Recalcular todos os saldos das contas baseado nos lançamentos confirmados
DO $$
DECLARE
  conta_record RECORD;
  receitas_total numeric;
  despesas_debito_total numeric;
BEGIN
  FOR conta_record IN SELECT id, saldo_inicial FROM contas LOOP
    -- Calcular receitas confirmadas
    SELECT COALESCE(SUM(valor), 0) INTO receitas_total
    FROM lancamentos 
    WHERE conta_id = conta_record.id 
      AND tipo = 'RECEITA' 
      AND status = 'CONFIRMADO';
    
    -- Calcular despesas em débito confirmadas
    SELECT COALESCE(SUM(valor), 0) INTO despesas_debito_total
    FROM lancamentos 
    WHERE conta_id = conta_record.id 
      AND tipo = 'DESPESA' 
      AND status = 'CONFIRMADO'
      AND forma_pagamento IN ('DEBITO', 'PIX', 'DINHEIRO');
    
    -- Atualizar saldo atual
    UPDATE contas 
    SET saldo_atual = COALESCE(conta_record.saldo_inicial, 0) + receitas_total - despesas_debito_total
    WHERE id = conta_record.id;
  END LOOP;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_status ON lancamentos(conta_id, status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_forma_pagamento ON lancamentos(forma_pagamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_cartao_credito ON lancamentos(conta_id, cartao_credito_usado) WHERE cartao_credito_usado IS NOT NULL;

-- Garantir que campos obrigatórios tenham valores padrão
UPDATE lancamentos SET status = 'CONFIRMADO' WHERE status IS NULL;
UPDATE lancamentos SET forma_pagamento = 'DEBITO' WHERE forma_pagamento IS NULL;
UPDATE lancamentos SET antecedencia_notificacao = 3 WHERE antecedencia_notificacao IS NULL;

-- Adicionar constraints para garantir integridade
ALTER TABLE lancamentos ALTER COLUMN status SET DEFAULT 'CONFIRMADO';
ALTER TABLE lancamentos ALTER COLUMN forma_pagamento SET DEFAULT 'DEBITO';
ALTER TABLE lancamentos ALTER COLUMN antecedencia_notificacao SET DEFAULT 3;