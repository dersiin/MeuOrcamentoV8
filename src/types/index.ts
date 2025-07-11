// Tipos centralizados para melhor tipagem
export interface User {
  id: string;
  email: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  moeda: string;
  fuso_horario: string;
  tema: string;
  notificacoes_email: boolean;
  notificacoes_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA';
  saldo_inicial: number;
  saldo_atual?: number;
  limite_credito?: number | null;
  valor_investido?: number | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  cor: string;
}

export interface Parcela {
  id: string;
  parcela_atual: number;
  total_parcelas: number;
  data: string;
  valor: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
}

export interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: 'RECEITA' | 'DESPESA' | 'grupo_parcelas';
  conta_id: string;
  categoria_id: string;
  observacoes?: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
  antecedencia_notificacao?: number;
  cartao_credito_usado?: string;
  isParcelado?: boolean;
  numeroParcelas?: number;
  forma_pagamento?: 'DEBITO' | 'CREDITO';
  tipo_transacao?: 'RECEITA' | 'DESPESA';
  total_parcelas?: number;
  parcela_atual?: number;
  parcelas?: Parcela[];
  compra_parcelada_id?: string;
}

export interface MetaFinanceira {
  id: string;
  user_id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA';
  valor_meta: number;
  valor_atual: number;
  data_inicio: string;
  data_fim: string;
  status: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
  cor: string;
  notificar_progresso: boolean;
  created_at: string;
  updated_at: string;
  categoria?: Categoria;
}

export interface Orcamento {
  id: string;
  user_id: string;
  categoria_id: string;
  ano: number;
  mes: number;
  valor_orcado: number;
  valor_gasto: number;
  alerta_percentual: number;
  created_at: string;
  updated_at: string;
  categoria?: Categoria;
}

export interface Lembrete {
  id: string;
  user_id: string;
  categoria_id: string | null;
  titulo: string;
  descricao: string | null;
  valor: number | null;
  data_vencimento: string;
  tipo: 'PAGAMENTO' | 'RECEBIMENTO' | 'META' | 'ORCAMENTO';
  frequencia: 'UNICO' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | null;
  status: 'PENDENTE' | 'NOTIFICADO' | 'CONCLUIDO' | 'CANCELADO';
  antecedencia_dias: number;
  created_at: string;
  updated_at: string;
  categoria?: Categoria;
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  icon?: string;
}

export interface DashboardData {
  kpis: KPI[];
  lancamentos: Lancamento[];
  categorias: Categoria[];
  contas: Conta[];
  metas: MetaFinanceira[];
  orcamentos: Orcamento[];
}

export interface FinancialSummary {
  receitas: number;
  despesas: number;
  saldo: number;
  taxaPoupanca: number;
  gastoDiarioMedio: number;
  patrimonioLiquido: number;
  totalLimiteCredito: number;
  totalUsadoCartao: number;
  limiteDisponivelCartao: number;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface FluxoCaixaData {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
  acumulado: number;
}

export interface AnomaliaDetectada {
  id: string;
  tipo: 'GASTO_ALTO' | 'CATEGORIA_INCOMUM' | 'FREQUENCIA_ANORMAL';
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA';
}

export interface PatrimonioItem {
  id: string;
  nome: string;
  tipo: 'IMOVEL' | 'VEICULO' | 'INVESTIMENTO' | 'OUTRO';
  valor_atual: number;
  valor_compra: number;
  data_aquisicao: string;
  descricao?: string;
}