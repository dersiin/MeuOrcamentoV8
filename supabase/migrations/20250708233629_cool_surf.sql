/*
  # Atualizar trigger de saldo das contas

  1. Atualizar função para considerar forma_pagamento
    - Débito: afeta o saldo da conta
    - Crédito: não afeta o saldo da conta (vai para fatura)

  2. Recriar trigger com nova lógica
*/

-- Remover trigger e função existentes
DROP TRIGGER IF EXISTS trigger_update_conta_saldo ON lancamentos;
DROP FUNCTION IF EXISTS update_conta_saldo();

-- Criar nova função que considera forma_pagamento
CREATE OR REPLACE FUNCTION update_conta_saldo()
RETURNS TRIGGER AS $$
BEGIN
  -- Para INSERT
  IF TG_OP = 'INSERT' THEN
    -- Só atualiza saldo se for débito ou receita
    IF NEW.forma_pagamento = 'DEBITO' OR NEW.tipo = 'RECEITA' THEN
      IF NEW.tipo = 'RECEITA' THEN
        UPDATE contas 
        SET saldo_atual = saldo_atual + NEW.valor 
        WHERE id = NEW.conta_id;
      ELSE -- DESPESA no débito
        UPDATE contas 
        SET saldo_atual = saldo_atual - NEW.valor 
        WHERE id = NEW.conta_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Para UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Reverter o efeito do valor antigo (se aplicável)
    IF OLD.forma_pagamento = 'DEBITO' OR OLD.tipo = 'RECEITA' THEN
      IF OLD.tipo = 'RECEITA' THEN
        UPDATE contas 
        SET saldo_atual = saldo_atual - OLD.valor 
        WHERE id = OLD.conta_id;
      ELSE -- DESPESA no débito
        UPDATE contas 
        SET saldo_atual = saldo_atual + OLD.valor 
        WHERE id = OLD.conta_id;
      END IF;
    END IF;

    -- Aplicar o efeito do novo valor (se aplicável)
    IF NEW.forma_pagamento = 'DEBITO' OR NEW.tipo = 'RECEITA' THEN
      IF NEW.tipo = 'RECEITA' THEN
        UPDATE contas 
        SET saldo_atual = saldo_atual + NEW.valor 
        WHERE id = NEW.conta_id;
      ELSE -- DESPESA no débito
        UPDATE contas 
        SET saldo_atual = saldo_atual - NEW.valor 
        WHERE id = NEW.conta_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    -- Reverter o efeito (se aplicável)
    IF OLD.forma_pagamento = 'DEBITO' OR OLD.tipo = 'RECEITA' THEN
      IF OLD.tipo = 'RECEITA' THEN
        UPDATE contas 
        SET saldo_atual = saldo_atual - OLD.valor 
        WHERE id = OLD.conta_id;
      ELSE -- DESPESA no débito
        UPDATE contas 
        SET saldo_atual = saldo_atual + OLD.valor 
        WHERE id = OLD.conta_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
CREATE TRIGGER trigger_update_conta_saldo
  AFTER INSERT OR UPDATE OR DELETE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_conta_saldo();

-- Recalcular saldos atuais baseado nos lançamentos existentes
UPDATE contas 
SET saldo_atual = saldo_inicial + COALESCE(
  (SELECT 
    SUM(CASE 
      WHEN l.tipo = 'RECEITA' THEN l.valor
      WHEN l.tipo = 'DESPESA' AND l.forma_pagamento = 'DEBITO' THEN -l.valor
      ELSE 0
    END)
   FROM lancamentos l 
   WHERE l.conta_id = contas.id 
   AND l.status = 'CONFIRMADO'
  ), 0
);