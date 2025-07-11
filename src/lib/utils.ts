import { format, startOfMonth, endOfMonth, addMonths, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Lancamento, Categoria, Conta, Parcela } from '../types';
import type { Lancamento as LancamentoType } from '../types';

export type LancamentoFormData = {
  descricao: string;
  valor: number;
  data: string;
  tipo: 'RECEITA' | 'DESPESA';
  conta_id: string;
  categoria_id: string;
  observacoes?: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
  antecedencia_notificacao?: number;
  cartao_credito_usado?: string;
  isParcelado?: boolean;
  numeroParcelas?: number;
  forma_pagamento?: 'DEBITO' | 'CREDITO' | 'PIX';
};

export type ContaFormData = {
  nome: string;
  tipo: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA';
  saldo_inicial: number;
  limite_credito: number;
  valor_investido: number;
  banco?: string;
  agencia?: string;
  conta?: string;
  cor: string;
};

export type CategoriaFormData = {
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  cor: string;
  descricao?: string;
};

export type MetaFormData = {
  nome: string;
  descricao?: string;
  tipo: 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA';
  valor_meta: string | number;
  data_inicio: string;
  data_fim: string;
  categoria_id?: string;
  cor: string;
};

export type OrcamentoFormData = {
  categoria_id: string;
  valor_orcado: number;
  alerta_percentual: number;
};

export type PagamentoFaturaFormData = {
  contaOrigem: string;
  valorPagamento: string;
};

export type DividaFormData = {
  nome: string;
  tipo: 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO_CREDITO' | 'OUTRO';
  valor_total: number;
  taxa_juros: number;
  data_inicio: string;
  data_vencimento: string;
  parcelas_total: number;
  observacoes?: string;
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCurrencyInput(value: string | number): string {
  // Se for número, converte para string formatada
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Remove tudo que não é dígito
  const numericValue = value.replace(/\D/g, '');
  
  // Se vazio, retorna vazio
  if (!numericValue) return '';
  
  // Converte para número (centavos)
  const numberValue = parseInt(numericValue) / 100;
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function parseCurrencyInput(value: string | number): number {
  // Se o valor já for um número, podemos simplesmente retorná-lo.
  if (typeof value === 'number') {
    return value;
  }

  // Se for uma string, continuamos com a lógica original.
  // Remove tudo que não é dígito
  const numericValue = value.replace(/\D/g, '');
  
  // Se vazio, retorna 0
  if (!numericValue) return 0;
  
  // Converte para número (centavos para reais)
  return parseInt(numericValue) / 100;
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Hoje';
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `${diffInDays} dias atrás`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} meses atrás`;
  return `${Math.floor(diffInDays / 365)} anos atrás`;
}

export function getCurrentMonthTransactions(lancamentos: Lancamento[]): Lancamento[] {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  
  return lancamentos.filter((lancamento) => {
    const dataLancamento = parseISO(lancamento.data);
    return dataLancamento >= inicioMes && dataLancamento <= fimMes;
  });
}

export function calculateFinancialSummary(lancamentos: Lancamento[]): { receitas: number; despesas: number; saldo: number } {
  const receitas = lancamentos
    .filter((l) => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
    .reduce((sum, l) => sum + l.valor, 0);
    
  const despesas = lancamentos
    .filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
    .reduce((sum, l) => sum + l.valor, 0);
    
  const saldo = receitas - despesas;
  
  return { receitas, despesas, saldo };
}

export function groupExpensesByCategory(
  lancamentos: Lancamento[],
  categorias: Categoria[]
): Array<{ nome: string; valor: number; cor: string; porcentagem: number }> {
  const despesas = lancamentos.filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
  const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
  
  if (totalDespesas === 0) return [];
  
  const grupos = despesas.reduce((acc, lancamento) => {
    const categoria = categorias.find((c) => c.id === lancamento.categoria_id);
    if (!categoria) return acc;
    
    if (!acc[categoria.id]) {
      acc[categoria.id] = {
        nome: categoria.nome,
        valor: 0,
        cor: categoria.cor,
        porcentagem: 0,
      };
    }
    
    acc[categoria.id].valor += lancamento.valor;
    return acc;
  }, {} as Record<string, { nome: string; valor: number; cor: string; porcentagem: number }>);
  
  return Object.values(grupos)
    .map((grupo) => ({
      ...grupo,
      porcentagem: (grupo.valor / totalDespesas) * 100,
    }))
    .sort((a, b) => b.valor - a.valor);
}

export function getMonthlyEvolution(lancamentos: Lancamento[]): Array<{
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}> {
  const hoje = new Date();
  const meses: Array<{ mes: string; receitas: number; despesas: number; saldo: number }> = [];
  
  // Últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const mesAtual = subMonths(hoje, i);
    const inicioMes = startOfMonth(mesAtual);
    const fimMes = endOfMonth(mesAtual);
    
    const transacoesMes = lancamentos.filter((lancamento) => {
      const dataLancamento = parseISO(lancamento.data);
      return dataLancamento >= inicioMes && dataLancamento <= fimMes && lancamento.status === 'CONFIRMADO';
    });
    
    const { receitas, despesas, saldo } = calculateFinancialSummary(transacoesMes);
    
    meses.push({
      mes: format(mesAtual, 'MMM/yy', { locale: ptBR }),
      receitas,
      despesas,
      saldo,
    });
  }
  
  return meses;
}

export function getTopCategories(
  lancamentos: Lancamento[],
  categorias: Categoria[],
  limit: number = 5
): Array<{ nome: string; valor: number; cor: string }> {
  const despesas = lancamentos.filter((l) => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
  
  const grupos = despesas.reduce((acc, lancamento) => {
    const categoria = categorias.find((c) => c.id === lancamento.categoria_id);
    if (!categoria) return acc;
    
    if (!acc[categoria.id]) {
      acc[categoria.id] = {
        nome: categoria.nome,
        valor: 0,
        cor: categoria.cor,
      };
    }
    
    acc[categoria.id].valor += lancamento.valor;
    return acc;
  }, {} as Record<string, { nome: string; valor: number; cor: string }>);
  
  return Object.values(grupos)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit);
}

export function createParcelaLancamentos(
  dadosBase: Lancamento,
  numeroParcelas: number
): Lancamento[] {
  const compraParceladaId = crypto.randomUUID();
  const valorParcela = Math.round((dadosBase.valor / numeroParcelas) * 100) / 100;
  const dataBase = parseISO(dadosBase.data);
  
  const parcelas: Lancamento[] = [];
  
  for (let i = 0; i < numeroParcelas; i++) {
    const dataParcela = addMonths(dataBase, i);
    
    // Para a última parcela, ajusta o valor para compensar arredondamentos
    const valorFinal = i === numeroParcelas - 1 
      ? dadosBase.valor - (valorParcela * (numeroParcelas - 1))
      : valorParcela;
    
    parcelas.push({
      ...dadosBase,
      valor: valorFinal,
      data: format(dataParcela, 'yyyy-MM-dd'),
      descricao: `${dadosBase.descricao} (${i + 1}/${numeroParcelas})`,
      compra_parcelada_id: compraParceladaId,
      parcela_atual: i + 1,
      total_parcelas: numeroParcelas,
    });
  }
  
  return parcelas;
}

export function exportToJson(data: any, filename: string): void {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function importFromJson(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Arquivo JSON inválido'));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsText(file);
  });
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateCurrency(value: string): boolean {
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue > 0;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateColor(): string {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function validateLancamentoField(
  field: keyof LancamentoFormData,
  value: any,
  formData: LancamentoFormData,
  temCartaoCredito: boolean = false
): string {
  switch (field) {
    case 'descricao':
      if (!value || typeof value !== 'string' || !value.trim()) return 'Descrição é obrigatória';
      break;
    case 'valor':
      if (value === undefined || value === null || isNaN(value) || value <= 0) return 'Valor deve ser maior que zero';
      break;
    case 'conta_id':
      if (!value) return 'Selecione uma conta';
      break;
    case 'categoria_id':
      if (!value) return 'Selecione uma categoria';
      break;
    case 'numeroParcelas':
      if (formData.isParcelado && (value < 2 || value > 24)) return 'Número de parcelas deve estar entre 2 e 24';
      break;
    case 'forma_pagamento':
      if (
        formData.tipo === 'DESPESA' &&
        (!value || (temCartaoCredito && !['DEBITO', 'CREDITO'].includes(value)))
      )
        return 'Selecione a forma de pagamento';
      break;
    case 'data':
      if (!value || isNaN(Date.parse(value))) return 'Data inválida';
      break;
    default:
      break;
  }
  return '';
}

export function validateLancamentoForm(
  formData: LancamentoFormData,
  temCartaoCredito: boolean = false
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  errors.descricao = validateLancamentoField('descricao', formData.descricao, formData, temCartaoCredito);
  errors.valor = validateLancamentoField('valor', formData.valor, formData, temCartaoCredito);
  errors.conta_id = validateLancamentoField('conta_id', formData.conta_id, formData, temCartaoCredito);
  errors.categoria_id = validateLancamentoField('categoria_id', formData.categoria_id, formData, temCartaoCredito);
  errors.data = validateLancamentoField('data', formData.data, formData, temCartaoCredito);
  if (formData.isParcelado) {
    errors.numeroParcelas = validateLancamentoField('numeroParcelas', formData.numeroParcelas, formData, temCartaoCredito);
  }
  if (formData.tipo === 'DESPESA') {
    errors.forma_pagamento = validateLancamentoField('forma_pagamento', formData.forma_pagamento, formData, temCartaoCredito);
  }
  // Remove campos sem erro
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateContaField(field: keyof ContaFormData, value: any, formData: ContaFormData): string {
  switch (field) {
    case 'nome':
      if (!value || typeof value !== 'string' || !value.trim()) return 'Nome da conta é obrigatório';
      break;
    case 'tipo':
      if (!value) return 'Tipo de conta é obrigatório';
      break;
    case 'saldo_inicial':
      if (value < 0) return 'Saldo inicial não pode ser negativo';
      break;
    case 'limite_credito':
      if (value < 0) return 'Limite de crédito não pode ser negativo';
      break;
    case 'valor_investido':
      if (value < 0) return 'Valor investido não pode ser negativo';
      break;
    default:
      break;
  }
  return '';
}

export function validateContaForm(formData: ContaFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  errors.nome = validateContaField('nome', formData.nome, formData);
  errors.tipo = validateContaField('tipo', formData.tipo, formData);
  errors.saldo_inicial = validateContaField('saldo_inicial', formData.saldo_inicial, formData);
  errors.limite_credito = validateContaField('limite_credito', formData.limite_credito, formData);
  errors.valor_investido = validateContaField('valor_investido', formData.valor_investido, formData);
  // Remove campos sem erro
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateCategoriaField(field: keyof CategoriaFormData, value: any, formData: CategoriaFormData): string {
  switch (field) {
    case 'nome':
      if (!value || typeof value !== 'string' || !value.trim()) return 'Nome da categoria é obrigatório';
      break;
    case 'tipo':
      if (!value) return 'Tipo é obrigatório';
      break;
    case 'cor':
      if (!value) return 'Cor é obrigatória';
      break;
    default:
      break;
  }
  return '';
}

export function validateCategoriaForm(formData: CategoriaFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  errors.nome = validateCategoriaField('nome', formData.nome, formData);
  errors.tipo = validateCategoriaField('tipo', formData.tipo, formData);
  errors.cor = validateCategoriaField('cor', formData.cor, formData);
  // Remove campos sem erro
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateMetaField(field: keyof MetaFormData, value: any, formData: MetaFormData): string {
  switch (field) {
    case 'nome':
      if (!value || typeof value !== 'string' || !value.trim()) return 'Nome da meta é obrigatório';
      break;
    case 'tipo':
      if (!value) return 'Tipo é obrigatório';
      break;
    case 'valor_meta':
      if (value === '' || isNaN(Number(value)) || Number(value) <= 0) return 'Valor da meta deve ser maior que zero';
      break;
    case 'data_inicio':
      if (!value || isNaN(Date.parse(value))) return 'Data de início inválida';
      break;
    case 'data_fim':
      if (!value || isNaN(Date.parse(value))) return 'Data de fim inválida';
      if (formData.data_inicio && value < formData.data_inicio) return 'Data de fim deve ser após a data de início';
      break;
    case 'cor':
      if (!value) return 'Cor é obrigatória';
      break;
    default:
      break;
  }
  return '';
}

export function validateMetaForm(formData: MetaFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  errors.nome = validateMetaField('nome', formData.nome, formData);
  errors.tipo = validateMetaField('tipo', formData.tipo, formData);
  errors.valor_meta = validateMetaField('valor_meta', formData.valor_meta, formData);
  errors.data_inicio = validateMetaField('data_inicio', formData.data_inicio, formData);
  errors.data_fim = validateMetaField('data_fim', formData.data_fim, formData);
  errors.cor = validateMetaField('cor', formData.cor, formData);
  // Remove campos sem erro
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateOrcamentoField(field: keyof OrcamentoFormData, value: any, formData: OrcamentoFormData): string {
  switch (field) {
    case 'categoria_id':
      if (!value || typeof value !== 'string' || !value.trim()) return 'Categoria é obrigatória';
      break;
    case 'valor_orcado':
      if (value === undefined || value === null || isNaN(Number(value)) || Number(value) <= 0) return 'Valor orçado deve ser maior que zero';
      break;
    case 'alerta_percentual':
      if (value === undefined || value === null || isNaN(Number(value)) || Number(value) < 1 || Number(value) > 100) return 'Percentual de alerta deve ser entre 1 e 100';
      break;
    default:
      break;
  }
  return '';
}

export function validateOrcamentoForm(formData: OrcamentoFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  errors.categoria_id = validateOrcamentoField('categoria_id', formData.categoria_id, formData);
  errors.valor_orcado = validateOrcamentoField('valor_orcado', formData.valor_orcado, formData);
  errors.alerta_percentual = validateOrcamentoField('alerta_percentual', formData.alerta_percentual, formData);
  // Remove campos sem erro
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validatePagamentoFaturaField(field: keyof PagamentoFaturaFormData, value: any, formData: PagamentoFaturaFormData): string {
  switch (field) {
    case 'contaOrigem':
      if (!value || typeof value !== 'string' || !value.trim()) return 'Selecione a conta de origem';
      break;
    case 'valorPagamento':
      if (!value || isNaN(Number(value.replace(/[^\d,\.]/g, '').replace(',', '.'))) || Number(value.replace(/[^\d,\.]/g, '').replace(',', '.')) <= 0) return 'Informe um valor válido para pagamento';
      break;
    default:
      break;
  }
  return '';
}

export function validatePagamentoFaturaForm(formData: PagamentoFaturaFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  errors.contaOrigem = validatePagamentoFaturaField('contaOrigem', formData.contaOrigem, formData);
  errors.valorPagamento = validatePagamentoFaturaField('valorPagamento', formData.valorPagamento, formData);
  // Remove campos sem erro
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateDividaField(field: keyof DividaFormData, value: any, formData: DividaFormData): string {
  switch (field) {
    case 'nome':
      if (!value || typeof value !== 'string' || !value.trim()) return 'Nome é obrigatório';
      break;
    case 'tipo':
      if (!value) return 'Tipo é obrigatório';
      break;
    case 'valor_total':
      if (value === undefined || value === null || isNaN(Number(value)) || Number(value) <= 0) return 'Valor total deve ser maior que zero';
      break;
    case 'taxa_juros':
      if (value === undefined || value === null || isNaN(Number(value)) || Number(value) < 0) return 'Taxa de juros não pode ser negativa';
      break;
    case 'data_inicio':
      if (!value || isNaN(Date.parse(value))) return 'Data de início inválida';
      break;
    case 'data_vencimento':
      if (!value || isNaN(Date.parse(value))) return 'Data de vencimento inválida';
      if (formData.data_inicio && value < formData.data_inicio) return 'Data de vencimento deve ser após a data de início';
      break;
    case 'parcelas_total':
      if (value === undefined || value === null || isNaN(Number(value)) || Number(value) < 1) return 'Número de parcelas deve ser pelo menos 1';
      break;
    default:
      break;
  }
  return '';
}

export function validateDividaForm(formData: DividaFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  errors.nome = validateDividaField('nome', formData.nome, formData);
  errors.tipo = validateDividaField('tipo', formData.tipo, formData);
  errors.valor_total = validateDividaField('valor_total', formData.valor_total, formData);
  errors.taxa_juros = validateDividaField('taxa_juros', formData.taxa_juros, formData);
  errors.data_inicio = validateDividaField('data_inicio', formData.data_inicio, formData);
  errors.data_vencimento = validateDividaField('data_vencimento', formData.data_vencimento, formData);
  errors.parcelas_total = validateDividaField('parcelas_total', formData.parcelas_total, formData);
  // Remove campos sem erro
  Object.keys(errors).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function agruparLancamentos(lancamentos: Lancamento[]): Lancamento[] {
  const grupos: Lancamento[] = [];
  const processados = new Set<string>();
  lancamentos.forEach(lancamento => {
    if (processados.has(lancamento.id)) return;
    if (lancamento.compra_parcelada_id) {
      const parcelas = lancamentos.filter(l => l.compra_parcelada_id === lancamento.compra_parcelada_id)
        .sort((a, b) => (a.parcela_atual || 0) - (b.parcela_atual || 0));
      parcelas.forEach(p => processados.add(p.id));
      const valorTotal = parcelas.reduce((sum, p) => sum + p.valor, 0);
      const primeiraParcela = parcelas[0];
      grupos.push({
        id: lancamento.compra_parcelada_id,
        tipo: 'grupo_parcelas',
        descricao: primeiraParcela.descricao.replace(/ \(\d+\/\d+\)$/, ''),
        valor: valorTotal,
        data: primeiraParcela.data,
        tipo_transacao: primeiraParcela.tipo,
        conta_id: primeiraParcela.conta_id,
        categoria_id: primeiraParcela.categoria_id,
        status: primeiraParcela.status,
        total_parcelas: primeiraParcela.total_parcelas,
        cartao_credito_usado: primeiraParcela.cartao_credito_usado,
        categoria: primeiraParcela.categoria,
        conta: primeiraParcela.conta,
        parcelas: parcelas,
        created_at: primeiraParcela.created_at
      });
    } else {
      grupos.push({ ...lancamento, tipo_transacao: lancamento.tipo, tipo: 'individual' });
      processados.add(lancamento.id);
    }
  });
  return grupos;
}

export function filtrarLancamentos(lancamentosAgrupados: Lancamento[], searchTerm: string, filters: any): Lancamento[] {
  let resultado = lancamentosAgrupados;
  if (searchTerm) {
    resultado = resultado.filter(l => l.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  if (filters.tipo !== 'TODOS') {
    resultado = resultado.filter(l => l.tipo_transacao === filters.tipo || l.tipo === filters.tipo);
  }
  if (filters.status !== 'TODOS') {
    resultado = resultado.filter(l => l.status === filters.status);
  }
  if (filters.categoriaId) {
    resultado = resultado.filter(l => l.categoria_id === filters.categoriaId);
  }
  if (filters.contaId) {
    resultado = resultado.filter(l => l.conta_id === filters.contaId);
  }
  if (filters.dataInicio) {
    resultado = resultado.filter(l => l.data >= filters.dataInicio);
  }
  if (filters.dataFim) {
    resultado = resultado.filter(l => l.data <= filters.dataFim);
  }
  return resultado.sort((a, b) => new Date(b.data || b.created_at).getTime() - new Date(a.data || a.created_at).getTime());
}

// Validações para Transferências
export const validateTransferenciaField = (field: string, value: any, formData: any, contas: any[]): string => {
  let error = '';
  switch (field) {
    case 'contaOrigem':
      if (!value) error = 'Selecione a conta de origem';
      break;
    case 'contaDestino':
      if (!value) error = 'Selecione a conta de destino';
      if (value === formData.contaOrigem) error = 'A conta de destino deve ser diferente da origem';
      break;
    case 'valor':
      const valor = parseFloat(value);
      if (!value || isNaN(valor) || valor <= 0) error = 'Valor deve ser maior que zero';
      const contaOrigemObj = contas.find(c => c.id === formData.contaOrigem);
      if (contaOrigemObj && valor > contaOrigemObj.saldo_atual) error = 'Saldo insuficiente na conta de origem';
      break;
    case 'descricao':
      if (!value.trim()) error = 'Descrição é obrigatória';
      break;
    default:
      break;
  }
  return error;
};

export const validateTransferenciaForm = (formData: any, contas: any[]): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!formData.contaOrigem) {
    errors.contaOrigem = 'Selecione a conta de origem';
  }
  
  if (!formData.contaDestino) {
    errors.contaDestino = 'Selecione a conta de destino';
  }
  
  if (formData.contaOrigem === formData.contaDestino) {
    errors.contaDestino = 'A conta de destino deve ser diferente da origem';
  }
  
  const valor = parseFloat(formData.valor);
  if (!formData.valor || isNaN(valor) || valor <= 0) {
    errors.valor = 'Valor deve ser maior que zero';
  }
  
  const contaOrigemObj = contas.find(c => c.id === formData.contaOrigem);
  if (contaOrigemObj && valor > contaOrigemObj.saldo_atual) {
    errors.valor = 'Saldo insuficiente na conta de origem';
  }
  
  if (!formData.descricao.trim()) {
    errors.descricao = 'Descrição é obrigatória';
  }
  
  return errors;
};

// Validações para Conciliação Bancária
export const validateConciliacaoField = (field: string, value: any): string => {
  let error = '';
  switch (field) {
    case 'contaSelecionada':
      if (!value) error = 'Selecione uma conta para importar';
      break;
    case 'arquivo':
      if (!value) error = 'Selecione um arquivo para importar';
      break;
    default:
      break;
  }
  return error;
};

export const validateConciliacaoForm = (formData: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!formData.contaSelecionada) {
    errors.contaSelecionada = 'Selecione uma conta para importar';
  }
  
  if (!formData.arquivo) {
    errors.arquivo = 'Selecione um arquivo para importar';
  }
  
  return errors;
};

// Validações para OCR Recibos
export const validateOCRField = (field: string, value: any): string => {
  let error = '';
  switch (field) {
    case 'contaSelecionada':
      if (!value) error = 'Selecione uma conta para importar';
      break;
    case 'arquivo':
      if (!value) error = 'Selecione uma imagem para processar';
      break;
    default:
      break;
  }
  return error;
};

export const validateOCRForm = (formData: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!formData.contaSelecionada) {
    errors.contaSelecionada = 'Selecione uma conta para importar';
  }
  
  if (!formData.arquivo) {
    errors.arquivo = 'Selecione uma imagem para processar';
  }
  
  return errors;
};

// Validações para ChatBot
export const validateChatBotCommand = (message: string, categorias: any[], contas: any[]): { isValid: boolean; error?: string; data?: any } => {
  const msg = message.toLowerCase();

  // Validar se há dados necessários
  if (!contas || contas.length === 0) {
    return {
      isValid: false,
      error: 'Você precisa ter pelo menos uma conta cadastrada para criar um lançamento. Crie uma conta primeiro dizendo: "Criar conta corrente Banco do Brasil".'
    };
  }

  if (!categorias || categorias.length === 0) {
    return {
      isValid: false,
      error: 'Você precisa ter pelo menos uma categoria cadastrada para criar um lançamento. As categorias são criadas automaticamente quando você cria seu perfil. Tente recarregar a página ou criar uma categoria manualmente.'
    };
  }

  // Padrões para criar lançamento
  const lancamentoPatterns = [
    /gastei.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?com\s*(.+)/i,
    /criar.*lançamento.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?para\s*(.+)/i,
    /adicionar.*gasto.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?em\s*(.+)/i,
    /registrar.*despesa.*?r?\$?\s*(\d+(?:[.,]\d{2})?)\s*.*?categoria\s*(.+)/i
  ];

  for (const pattern of lancamentoPatterns) {
    const match = message.match(pattern);
    if (match) {
      const valorStr = match[1].replace(',', '.');
      const valor = parseFloat(valorStr);
      
      if (isNaN(valor) || valor <= 0) {
        return {
          isValid: false,
          error: 'O valor do lançamento deve ser um número positivo.'
        };
      }

      const descricao = match[2].trim();
      
      let categoria = categorias.find(c => 
        c.nome.toLowerCase().includes(descricao.toLowerCase()) ||
        descricao.toLowerCase().includes(c.nome.toLowerCase())
      );

      if (!categoria) {
        categoria = categorias.find(c => c.tipo === 'DESPESA');
      }

      if (!categoria) {
        categoria = categorias[0];
      }

      if (!categoria || !categoria.id) {
        return {
          isValid: false,
          error: 'Não foi possível encontrar uma categoria válida. Verifique se você possui categorias cadastradas.'
        };
      }

      const contaAtiva = contas.find(c => c.ativa !== false) || contas[0];

      if (!contaAtiva || !contaAtiva.id) {
        return {
          isValid: false,
          error: 'Não foi possível encontrar uma conta válida. Verifique se você possui contas cadastradas.'
        };
      }

      return {
        isValid: true,
        data: {
          descricao: `Gasto com ${descricao}`,
          valor,
          tipo: 'DESPESA',
          categoria_id: categoria.id,
          conta_id: contaAtiva.id,
          data: new Date().toISOString().split('T')[0]
        }
      };
    }
  }

  // Padrões para criar meta
  const metaPatterns = [
    /criar.*meta.*?r?\$?\s*(\d+(?:[.,]\d{2})?)/i,
    /definir.*objetivo.*?r?\$?\s*(\d+(?:[.,]\d{2})?)/i,
    /meta.*economia.*?r?\$?\s*(\d+(?:[.,]\d{2})?)/i
  ];

  for (const pattern of metaPatterns) {
    const match = message.match(pattern);
    if (match) {
      const valorStr = match[1].replace(',', '.');
      const valor = parseFloat(valorStr);
      
      if (isNaN(valor) || valor <= 0) {
        return {
          isValid: false,
          error: 'O valor da meta deve ser um número positivo.'
        };
      }
      
      return {
        isValid: true,
        data: {
          nome: 'Meta de Economia',
          tipo: 'ECONOMIA',
          valor_meta: valor,
          data_inicio: new Date().toISOString().split('T')[0],
          data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      };
    }
  }

  // Padrões para criar conta
  const contaPatterns = [
    /criar.*conta\s+(corrente|poupança|poupanca|investimento|carteira|cartão|cartao)(?:\s+(.+))?/i,
    /adicionar.*conta\s+(corrente|poupança|poupanca|investimento|carteira|cartão|cartao)(?:\s+(.+))?/i,
    /nova.*conta\s+(corrente|poupança|poupanca|investimento|carteira|cartão|cartao)(?:\s+(.+))?/i,
    /criar.*conta\s+(.+)/i
  ];

  for (const pattern of contaPatterns) {
    const match = message.match(pattern);
    if (match) {
      let tipo = 'CORRENTE';
      let nome = '';
      
      if (match[1]) {
        const tipoStr = match[1].toLowerCase();
        switch (tipoStr) {
          case 'poupança':
          case 'poupanca':
            tipo = 'POUPANCA';
            nome = match[2] ? `Poupança ${match[2]}` : 'Poupança';
            break;
          case 'investimento':
            tipo = 'INVESTIMENTO';
            nome = match[2] ? `Investimento ${match[2]}` : 'Investimento';
            break;
          case 'carteira':
            tipo = 'CARTEIRA';
            nome = match[2] ? `Carteira ${match[2]}` : 'Carteira';
            break;
          case 'cartão':
          case 'cartao':
            tipo = 'CARTAO';
            nome = match[2] ? `Cartão ${match[2]}` : 'Cartão de Crédito';
            break;
          default:
            nome = match[2] ? `Conta ${match[2]}` : 'Conta Corrente';
        }
      } else {
        nome = match[1] ? `Conta ${match[1]}` : 'Conta Corrente';
      }

      return {
        isValid: true,
        data: {
          nome,
          tipo,
          saldo_atual: 0,
          ativa: true
        }
      };
    }
  }

  return { isValid: false };
};