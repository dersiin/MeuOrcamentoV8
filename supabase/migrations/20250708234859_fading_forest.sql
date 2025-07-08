/*
  # Create dívidas table

  1. New Tables
    - `dividas`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `nome` (text, nome da dívida)
      - `tipo` (text, tipo da dívida)
      - `valor_total` (numeric, valor total da dívida)
      - `valor_pago` (numeric, valor já pago)
      - `valor_restante` (numeric, valor restante - calculado automaticamente)
      - `taxa_juros` (numeric, taxa de juros anual)
      - `data_inicio` (date, data de início)
      - `data_vencimento` (date, data de vencimento)
      - `parcela_valor` (numeric, valor da parcela)
      - `parcelas_total` (integer, total de parcelas)
      - `parcelas_pagas` (integer, parcelas já pagas)
      - `status` (text, status da dívida)
      - `observacoes` (text, observações opcionais)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `dividas` table
    - Add policy for authenticated users to manage their own dívidas

  3. Triggers
    - Auto-update `updated_at` timestamp
    - Auto-calculate `valor_restante` based on `valor_total - valor_pago`

  4. Constraints
    - Ensure data_vencimento > data_inicio
    - Ensure valor_pago <= valor_total
    - Ensure parcelas_pagas <= parcelas_total
    - Validate status values
    - Validate tipo values
*/

CREATE TABLE IF NOT EXISTS dividas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('EMPRESTIMO', 'FINANCIAMENTO', 'CARTAO_CREDITO', 'OUTRO')),
  valor_total numeric(15,2) NOT NULL CHECK (valor_total > 0),
  valor_pago numeric(15,2) DEFAULT 0 CHECK (valor_pago >= 0),
  valor_restante numeric(15,2) NOT NULL CHECK (valor_restante >= 0),
  taxa_juros numeric(5,2) DEFAULT 0 CHECK (taxa_juros >= 0),
  data_inicio date NOT NULL,
  data_vencimento date NOT NULL,
  parcela_valor numeric(15,2) NOT NULL CHECK (parcela_valor > 0),
  parcelas_total integer NOT NULL CHECK (parcelas_total > 0),
  parcelas_pagas integer DEFAULT 0 CHECK (parcelas_pagas >= 0),
  status text DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'QUITADA', 'EM_ATRASO')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_data_vencimento CHECK (data_vencimento > data_inicio),
  CONSTRAINT check_valor_pago CHECK (valor_pago <= valor_total),
  CONSTRAINT check_parcelas_pagas CHECK (parcelas_pagas <= parcelas_total)
);

ALTER TABLE dividas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dividas"
  ON dividas
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dividas_user_id ON dividas(user_id);
CREATE INDEX IF NOT EXISTS idx_dividas_status ON dividas(status);
CREATE INDEX IF NOT EXISTS idx_dividas_vencimento ON dividas(data_vencimento);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_dividas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dividas_updated_at
  BEFORE UPDATE ON dividas
  FOR EACH ROW
  EXECUTE FUNCTION update_dividas_updated_at();

-- Trigger para atualizar valor_restante automaticamente
CREATE OR REPLACE FUNCTION update_divida_valor_restante()
RETURNS TRIGGER AS $$
BEGIN
  NEW.valor_restante = NEW.valor_total - NEW.valor_pago;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_divida_valor_restante
  BEFORE INSERT OR UPDATE ON dividas
  FOR EACH ROW
  EXECUTE FUNCTION update_divida_valor_restante();