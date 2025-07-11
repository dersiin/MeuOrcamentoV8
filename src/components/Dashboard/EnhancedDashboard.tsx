import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart as PieChartIcon,
  Target,
  CreditCard,
  AlertCircle,
  Calendar,
  Zap,
  Wallet,
  TrendingUp as Growth,
  Percent,
  Plus,
  ArrowLeftRight,
  BarChart3,
  Eye,
  Clock,
  CheckCircle,
  // <<< MUDANÇA: Ícones adicionados para os novos insights.
  PiggyBank,
  Info,
  Scale
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CHART_COLORS } from '../../constants';
import type { DashboardData, FinancialSummary, KPI } from '../../types';
import { useValores } from '../Layout';
import { Tooltip } from '../Common/Tooltip';
import { PageTemplate } from '../Common/PageTemplate';

// <<< MUDANÇA: Novo tipo para definir a estrutura de cada insight da IA.
interface AiInsight {
  title: string;
  description: string;
  type: 'positivo' | 'atencao' | 'informativo';
  icon: string;
}

interface EnhancedDashboardProps {
  onNavigate?: (page: string) => void;
}

// Dropdown customizado para múltipla seleção
function MultiSelectDropdown({ label, options, selected, onChange, iconLeft, className, title, summaryFn }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  iconLeft?: React.ReactNode;
  className?: string;
  title?: string;
  summaryFn?: (selected: string[], options: { value: string; label: string }[]) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);
  const summary = summaryFn
    ? summaryFn(selected, options)
    : selected.length === 0
      ? label
      : selected.length === 1
        ? (options.find(o => o.value === selected[0])?.label ?? 'Selecionado')
        : `${selected.length} selecionadas`;
  return (
    <div className={`relative min-w-[150px] ${className || ''}`} ref={ref} title={title}>
      <button
        type="button"
        className={`w-full flex items-center pl-8 pr-4 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition h-10 min-h-[40px] max-h-[40px] min-w-[150px] appearance-none hover:ring-1 hover:ring-blue-200 shadow-sm ${open ? 'ring-2 ring-blue-200 border-blue-300' : ''}`}
        onClick={() => setOpen(o => !o)}
        title={title}
        style={{justifyContent: 'flex-start'}}
      >
        {iconLeft && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">{iconLeft}</span>}
        <span className="truncate text-left flex-1">{summary}</span>
        <svg className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight: 0}}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg animate-in p-0">
          <div className="p-2 space-y-1">
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={e => {
                    if (e.target.checked) onChange([...selected, opt.value]);
                    else onChange(selected.filter(v => v !== opt.value));
                  }}
                  className="accent-blue-600 w-4 h-4 rounded align-middle"
                  style={{marginTop: 0}}
                />
                <span className="truncate align-middle text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EnhancedDashboard({ onNavigate }: EnhancedDashboardProps) {
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    lancamentos: [],
    categorias: [],
    contas: [],
    metas: [],
    orcamentos: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  // Inicializar selectedContas e selectedCategorias com todas selecionadas
  const [selectedContas, setSelectedContas] = useState<string[]>(() => []);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>(() => []);
  useEffect(() => {
    if (data.contas.length > 0 && selectedContas.length === 0) {
      setSelectedContas(data.contas.map(c => c.id));
    }
  }, [data.contas]);
  useEffect(() => {
    if (data.categorias.length > 0 && selectedCategorias.length === 0) {
      setSelectedCategorias(data.categorias.map(c => c.id));
    }
  }, [data.categorias]);
  
  // <<< MUDANÇA: O estado agora armazena um array de objetos AiInsight, não uma string.
  const [aiInsights, setAiInsights] = useState<AiInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  // Estado para dicas financeiras
  const [financialTips, setFinancialTips] = useState<AiInsight[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  // Novos estados para as análises adicionais
  const [receitasAnalysis, setReceitasAnalysis] = useState<AiInsight[]>([]);
  const [loadingReceitas, setLoadingReceitas] = useState(false);
  const [despesasAnalysis, setDespesasAnalysis] = useState<AiInsight[]>([]);
  const [loadingDespesas, setLoadingDespesas] = useState(false);
  const [relatoriosInteligentes, setRelatoriosInteligentes] = useState<AiInsight[]>([]);
  const [loadingRelatorios, setLoadingRelatorios] = useState(false);
  // Estado global para controlar se alguma análise está em andamento
  const [anyAnalysisLoading, setAnyAnalysisLoading] = useState(false);
  const { valoresOfuscados } = useValores();
  // Estado para análise selecionada
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('');
  // 1. Adicione estado para controlar o modal
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange, selectedContas, selectedCategorias]);

  // Remover chamada automática ao LLM
  // useEffect(() => {
  //   if (data.lancamentos.length > 0 && !loading && aiInsights.length === 0) {
  //     loadAIInsights();
  //   }
  // }, [data.lancamentos, loading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Carregando dados do dashboard...');
      
      const hoje = new Date();
      let dataInicio: string;
      
      switch (timeRange) {
        case 'quarter':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0];
          break;
        case 'year':
          dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
        default:
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      }
      
      const dataFim = hoje.toISOString().split('T')[0];
      console.log('📅 Período:', { dataInicio, dataFim });

      const [categorias, contas, metas, orcamentos] = await Promise.all([
        DatabaseService.getCategorias(),
        DatabaseService.getContas(),
        DatabaseService.getMetas(),
        DatabaseService.getOrcamentos(hoje.getFullYear(), hoje.getMonth() + 1)
      ]);
      // Lançamentos com múltiplos filtros
      let lancamentos: any[] = [];
      if (selectedContas.length > 0 || selectedCategorias.length > 0) {
        // Se múltiplos, buscar todos e filtrar manualmente (Supabase não suporta .in com múltiplos campos ao mesmo tempo)
        const allLancamentos = await DatabaseService.getLancamentos({ dataInicio, dataFim });
        lancamentos = allLancamentos.filter(l =>
          (selectedContas.length === 0 || selectedContas.includes(l.conta_id)) &&
          (selectedCategorias.length === 0 || selectedCategorias.includes(l.categoria_id))
        );
      } else {
        lancamentos = await DatabaseService.getLancamentos({ dataInicio, dataFim });
      }

      console.log('📊 Dados carregados:', {
        lancamentos: lancamentos.length,
        categorias: categorias.length,
        contas: contas.length,
        metas: metas.length,
        orcamentos: orcamentos.length
      });

      setData({ 
        kpis: calculateKPIs({ lancamentos, categorias, contas, metas, orcamentos }),
        lancamentos, 
        categorias, 
        contas, 
        metas, 
        orcamentos 
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // <<< MUDANÇA: Função atualizada para processar a resposta JSON da IA.
  const loadAIInsights = async (dadosFinanceiros: any) => {
    if (anyAnalysisLoading) return; // Evita chamadas duplicadas
    try {
      setAnyAnalysisLoading(true);
      setLoadingInsights(true);
      const { AzureOpenAIService } = await import('../../lib/azureOpenAI');
      const insightsString = await AzureOpenAIService.analisarGastos(dadosFinanceiros);
      const insightsArray = JSON.parse(insightsString);
      setAiInsights(insightsArray);
    } catch (error) {
      setAiInsights([{ 
          title: "Insights em breve", 
          description: "Continue registrando suas finanças para receber análises detalhadas.", 
          type: 'informativo', 
          icon: 'Info' 
      }]);
    } finally {
      setLoadingInsights(false);
      setAnyAnalysisLoading(false);
    }
  };

  const calculateKPIs = (dashboardData: Omit<DashboardData, 'kpis'>): KPI[] => {
    const { lancamentos, contas } = dashboardData;
    
    const receitas = lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    
    const saldoLiquidoTotal = contas.reduce((sum, conta) => sum + conta.saldo_atual, 0);
    
    return [
      { label: 'Receitas do Período', value: formatCurrency(receitas), change: receitas > 0 ? 1 : 0, trend: receitas > 0 ? 'up' : 'stable', color: 'text-green-600', icon: 'TrendingUp' },
      { label: 'Despesas do Período', value: formatCurrency(despesas), change: despesas > 0 ? -1 : 0, trend: despesas > 0 ? 'down' : 'stable', color: 'text-red-600', icon: 'TrendingDown' },
      { label: 'Saldo do Período', value: formatCurrency(saldo), change: saldo >= 0 ? 1 : -1, trend: saldo >= 0 ? 'up' : 'down', color: saldo >= 0 ? 'text-green-600' : 'text-red-600', icon: 'DollarSign' },
      { label: 'Saldo Total das Contas', value: formatCurrency(saldoLiquidoTotal), change: saldoLiquidoTotal >= 0 ? 1 : -1, trend: saldoLiquidoTotal >= 0 ? 'up' : 'down', color: saldoLiquidoTotal >= 0 ? 'text-green-600' : 'text-red-600', icon: 'Wallet' }
    ];
  };

  const resumoFinanceiro = useMemo((): FinancialSummary => {
    const receitas = data.lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = data.lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    const taxaPoupanca = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
    
    const diasNoMes = new Date().getDate();
    const gastoDiarioMedio = despesas / diasNoMes;
    
    const patrimonioLiquido = data.contas.reduce((sum, conta) => sum + conta.saldo_atual, 0);
    
    const totalLimiteCredito = data.contas.reduce((sum, conta) => {
      return sum + (conta.limite_credito || 0);
    }, 0);
    
    const totalUsadoCartao = data.lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO' && l.cartao_credito_usado)
      .reduce((sum, l) => sum + l.valor, 0);
    
    const limiteDisponivelCartao = totalLimiteCredito - totalUsadoCartao;
    
    return {
      receitas,
      despesas,
      saldo,
      taxaPoupanca,
      gastoDiarioMedio,
      patrimonioLiquido,
      totalLimiteCredito,
      totalUsadoCartao,
      limiteDisponivelCartao
    };
  }, [data.lancamentos, data.contas]);

  const dadosGraficoPizza = useMemo(() => {
    const despesas = data.lancamentos.filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
    const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
    
    if (totalDespesas === 0) return [];
    
    const grupos = despesas.reduce((acc, lancamento) => {
      const categoria = data.categorias.find(c => c.id === lancamento.categoria_id);
      if (!categoria) return acc;
      
      if (!acc[categoria.id]) {
        acc[categoria.id] = {
          nome: categoria.nome,
          valor: 0,
          cor: categoria.cor || '#cccccc', // Adicionado fallback de cor
        };
      }
      
      acc[categoria.id].valor += lancamento.valor;
      return acc;
    }, {} as Record<string, { nome: string; valor: number; cor: string }>);
    
    return Object.values(grupos)
      .map(grupo => ({
        ...grupo,
        porcentagem: (grupo.valor / totalDespesas) * 100,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [data.lancamentos, data.categorias]);

  // 1. Calcular datas do período anterior
  const hoje = new Date();
  const inicioAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // último dia do mês anterior

  const lancamentosAnterior = data.lancamentos.filter(l => {
    if (!l.data) return false;
    const dataLanc = new Date(l.data);
    return dataLanc >= inicioAnterior && dataLanc <= fimAnterior;
  });

  const receitasAnterior = lancamentosAnterior.filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO').reduce((sum, l) => sum + l.valor, 0);
  const despesasAnterior = lancamentosAnterior.filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO').reduce((sum, l) => sum + l.valor, 0);
  const saldoAnterior = receitasAnterior - despesasAnterior;

  // 2. Calcular variação percentual
  const varPerc = (atual: number, anterior: number) => {
    if (anterior === 0) return atual === 0 ? 0 : 100;
    return ((atual - anterior) / Math.abs(anterior)) * 100;
  };

  const receitasAtual = resumoFinanceiro.receitas;
  const despesasAtual = resumoFinanceiro.despesas;
  const saldoAtual = resumoFinanceiro.saldo;

  // --- ANIMAÇÃO DE KPIs ---
  const [animateReceitas, setAnimateReceitas] = useState(false);
  const [animateDespesas, setAnimateDespesas] = useState(false);
  const [animateSaldo, setAnimateSaldo] = useState(false);
  const receitasPrev = useRef(receitasAtual);
  const despesasPrev = useRef(despesasAtual);
  const saldoPrev = useRef(saldoAtual);
  useEffect(() => {
    if (receitasPrev.current !== receitasAtual) {
      setAnimateReceitas(true);
      receitasPrev.current = receitasAtual;
      setTimeout(() => setAnimateReceitas(false), 600);
    }
  }, [receitasAtual]);
  useEffect(() => {
    if (despesasPrev.current !== despesasAtual) {
      setAnimateDespesas(true);
      despesasPrev.current = despesasAtual;
      setTimeout(() => setAnimateDespesas(false), 600);
    }
  }, [despesasAtual]);
  useEffect(() => {
    if (saldoPrev.current !== saldoAtual) {
      setAnimateSaldo(true);
      saldoPrev.current = saldoAtual;
      setTimeout(() => setAnimateSaldo(false), 600);
    }
  }, [saldoAtual]);

  const receitasVar = varPerc(receitasAtual, receitasAnterior);
  const despesasVar = varPerc(despesasAtual, despesasAnterior);
  const saldoVar = varPerc(saldoAtual, saldoAnterior);

  // <<< MUDANÇA: Função expandida para incluir os novos ícones.
  const getIconComponent = (iconName: string) => {
    const icons = {
      DollarSign,
      Percent,
      Calendar,
      Wallet,
      TrendingUp: Growth,
      TrendingDown,
      Target,
      CreditCard,
      AlertCircle,
      PiggyBank,
      Info,
      Scale
    };
    return icons[iconName as keyof typeof icons] || Info;
  };

  // Função para preparar dados financeiros para IA
  const getDadosFinanceiros = () => ({
    receitas: resumoFinanceiro.receitas,
    despesas: resumoFinanceiro.despesas,
    saldo: resumoFinanceiro.saldo,
    taxaPoupanca: resumoFinanceiro.taxaPoupanca,
    gastoDiarioMedio: resumoFinanceiro.gastoDiarioMedio,
    patrimonioLiquido: resumoFinanceiro.patrimonioLiquido,
    totalContas: data.contas.length,
    totalLancamentos: data.lancamentos.length,
    categoriasMaisGastas: dadosGraficoPizza.slice(0, 3).map(c => c.nome),
    periodo: timeRange === 'month' ? 'mês atual' : timeRange === 'quarter' ? 'últimos 3 meses' : 'ano atual'
  });

  // Carregar dicas financeiras junto com os insights
  const loadFinancialTips = async (dadosFinanceiros: any) => {
    if (anyAnalysisLoading) return; // Evita chamadas duplicadas
    try {
      setAnyAnalysisLoading(true);
      setLoadingTips(true);
      const { AzureOpenAIService } = await import('../../lib/azureOpenAI');
      const tipsString = await AzureOpenAIService.gerarDicasFinanceiras(dadosFinanceiros);
      const tipsArray = JSON.parse(tipsString);
      setFinancialTips(tipsArray);
    } catch (error) {
      setFinancialTips([{ 
        title: 'Dicas em breve', 
        description: 'Continue registrando suas finanças para receber dicas personalizadas.', 
        type: 'informativo', 
        icon: 'Info' 
      }]);
    } finally {
      setLoadingTips(false);
      setAnyAnalysisLoading(false);
    }
  };

  // Análise específica de receitas
  const loadReceitasAnalysis = async (dadosFinanceiros: any) => {
    if (anyAnalysisLoading) return; // Evita chamadas duplicadas
    try {
      setAnyAnalysisLoading(true);
      setLoadingReceitas(true);
      const { AzureOpenAIService } = await import('../../lib/azureOpenAI');
      const analysisString = await AzureOpenAIService.analisarReceitas(dadosFinanceiros);
      const analysisArray = JSON.parse(analysisString);
      setReceitasAnalysis(analysisArray);
    } catch (error) {
      setReceitasAnalysis([{ 
        title: 'Análise em breve', 
        description: 'Continue registrando suas receitas para receber análises detalhadas.', 
        type: 'informativo', 
        icon: 'Info' 
      }]);
    } finally {
      setLoadingReceitas(false);
      setAnyAnalysisLoading(false);
    }
  };

  // Análise específica de despesas
  const loadDespesasAnalysis = async (dadosFinanceiros: any) => {
    if (anyAnalysisLoading) return; // Evita chamadas duplicadas
    try {
      setAnyAnalysisLoading(true);
      setLoadingDespesas(true);
      const { AzureOpenAIService } = await import('../../lib/azureOpenAI');
      const analysisString = await AzureOpenAIService.analisarDespesas(dadosFinanceiros);
      const analysisArray = JSON.parse(analysisString);
      setDespesasAnalysis(analysisArray);
    } catch (error) {
      setDespesasAnalysis([{ 
        title: 'Análise em breve', 
        description: 'Continue registrando suas despesas para receber análises detalhadas.', 
        type: 'informativo', 
        icon: 'Info' 
      }]);
    } finally {
      setLoadingDespesas(false);
      setAnyAnalysisLoading(false);
    }
  };

  // Relatórios inteligentes
  const loadRelatoriosInteligentes = async (dadosFinanceiros: any) => {
    if (anyAnalysisLoading) return; // Evita chamadas duplicadas
    try {
      setAnyAnalysisLoading(true);
      setLoadingRelatorios(true);
      const { AzureOpenAIService } = await import('../../lib/azureOpenAI');
      const relatoriosString = await AzureOpenAIService.gerarRelatoriosInteligentes(dadosFinanceiros);
      const relatoriosArray = JSON.parse(relatoriosString);
      setRelatoriosInteligentes(relatoriosArray);
    } catch (error) {
      setRelatoriosInteligentes([{ 
        title: 'Relatórios em breve', 
        description: 'Continue registrando suas finanças para receber relatórios detalhados.', 
        type: 'informativo', 
        icon: 'Info' 
      }]);
    } finally {
      setLoadingRelatorios(false);
      setAnyAnalysisLoading(false);
    }
  };

  // --- ALERTAS ---
  const alertas: { icon: string; cor: string; titulo: string; descricao: string }[] = [];

  // 1. Saldo baixo em contas
  (data.contas || []).forEach(conta => {
    if ((conta.saldo_atual ?? 0) < 100) {
      alertas.push({
        icon: 'AlertCircle',
        cor: 'text-yellow-500',
        titulo: `Saldo baixo: ${conta.nome}`,
        descricao: `O saldo da conta está em ${formatCurrency(conta.saldo_atual ?? 0)}.`
      });
    }
  });

  // 2. Contas a pagar ou vencidas
  const hojeStr = new Date().toISOString().split('T')[0];
  (data.lancamentos || []).forEach(l => {
    if (l.tipo === 'DESPESA' && l.status === 'PENDENTE' && l.data && l.data <= hojeStr) {
      alertas.push({
        icon: 'AlertCircle',
        cor: 'text-red-500',
        titulo: `Conta a pagar: ${l.descricao || 'Despesa sem descrição'}`,
        descricao: `Vencida em ${formatDate(l.data)} no valor de ${formatCurrency(l.valor)}.`
      });
    }
  });

  // 3. Gastos acima da média em categoria (simples: >120% da média)
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();
  (data.categorias || []).forEach(cat => {
    const despesasCat = (data.lancamentos || []).filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO' && l.categoria_id === cat.id);
    const despesasMesAtual = despesasCat.filter(l => {
      const d = new Date(l.data);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });
    const valorMesAtual = despesasMesAtual.reduce((sum, l) => sum + l.valor, 0);
    const mesesAnteriores = despesasCat.filter(l => {
      const d = new Date(l.data);
      return d.getMonth() !== mesAtual || d.getFullYear() !== anoAtual;
    });
    const mediaAnterior = mesesAnteriores.length > 0 ? mesesAnteriores.reduce((sum, l) => sum + l.valor, 0) / mesesAnteriores.length : 0;
    if (mediaAnterior > 0 && valorMesAtual > 1.2 * mediaAnterior) {
      alertas.push({
        icon: 'TrendingUp',
        cor: 'text-orange-500',
        titulo: `Gasto alto em ${cat.nome || 'Despesa sem nome'}`,
        descricao: `Gasto de ${formatCurrency(valorMesAtual)} este mês, acima da média (${formatCurrency(mediaAnterior)}).`
      });
    }
  });

  // 4. Orçamento estourado
  (data.orcamentos || []).forEach(orc => {
    if ((orc.valor_orcado ?? 0) > 0 && (orc.valor_gasto ?? 0) > (orc.valor_orcado ?? 0)) {
      const cat = data.categorias.find(c => c.id === orc.categoria_id);
      alertas.push({
        icon: 'AlertCircle',
        cor: 'text-red-600',
        titulo: `Orçamento estourado${cat ? `: ${cat.nome || 'Despesa sem nome'}` : ''}`,
        descricao: `Gasto de ${formatCurrency(orc.valor_gasto ?? 0)} ultrapassou o limite de ${formatCurrency(orc.valor_orcado ?? 0)}.`
      });
    }
  });

  // 5. Metas próximas do vencimento ou não atingidas
  const hojeData = new Date();
  (data.metas || []).forEach(meta => {
    if ((meta.status === 'ATIVA' || meta.status === 'PAUSADA') && meta.data_fim) {
      const dataFim = new Date(meta.data_fim);
      const diasRestantes = Math.ceil((dataFim.getTime() - hojeData.getTime()) / (1000 * 60 * 60 * 24));
      if (diasRestantes >= 0 && diasRestantes <= 7) {
        alertas.push({
          icon: 'Target',
          cor: 'text-blue-600',
          titulo: `Meta próxima do vencimento: ${meta.nome || 'Despesa sem nome'}`,
          descricao: `Faltam ${diasRestantes} dia(s) para o prazo da meta terminar.`
        });
      }
      if (diasRestantes < 0 && (meta.valor_atual < meta.valor_meta)) {
        alertas.push({
          icon: 'Target',
          cor: 'text-red-600',
          titulo: `Meta não atingida: ${meta.nome || 'Despesa sem nome'}`,
          descricao: `A meta venceu em ${formatDate(meta.data_fim)} e não foi atingida.`
        });
      }
    }
  });

  // --- CALENDÁRIO ---
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const mesAtualDate = new Date();
  const ano = mesAtualDate.getFullYear();
  const mes = mesAtualDate.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const lancamentosPorDia: Record<string, typeof data.lancamentos> = {};
  data.lancamentos.forEach(l => {
    if (!l.data) return;
    const d = new Date(l.data);
    if (d.getMonth() === mes && d.getFullYear() === ano) {
      const dia = d.getDate();
      if (!lancamentosPorDia[dia]) lancamentosPorDia[dia] = [];
      lancamentosPorDia[dia].push(l);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Modal de Análises Inteligentes (renderizado no topo, fora do container principal)
  const analysisModal = showAnalysisModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 lg:p-10 w-full max-w-4xl relative animate-in">
        <button
          onClick={() => setShowAnalysisModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl font-bold focus:outline-none"
          aria-label="Fechar"
          type="button"
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-500" /> Análises Inteligentes
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Escolha uma análise para obter insights personalizados com IA.</p>
        <div className="flex flex-wrap justify-center items-center gap-4 py-2 mb-6 w-full">
          <Tooltip text="Gere insights inteligentes sobre suas finanças.">
          <button
              onClick={() => { setSelectedAnalysis('insights'); loadAIInsights(getDadosFinanceiros()); }}
              className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-200 ${anyAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              aria-label="Gerar Insights Inteligentes"
              type="button"
              disabled={anyAnalysisLoading}
            >
              <Zap className="w-5 h-5" />
              Insights
          </button>
          </Tooltip>
          <Tooltip text="Receba dicas financeiras personalizadas.">
          <button
              onClick={() => { setSelectedAnalysis('dicas'); loadFinancialTips(getDadosFinanceiros()); }}
              className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-200 ${anyAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              aria-label="Gerar Dicas Financeiras"
              type="button"
              disabled={anyAnalysisLoading}
            >
              <PiggyBank className="w-5 h-5" />
              Dicas
          </button>
          </Tooltip>
          <Tooltip text="Análise detalhada das suas receitas.">
          <button
              onClick={() => { setSelectedAnalysis('receitas'); loadReceitasAnalysis(getDadosFinanceiros()); }}
              className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-200 ${anyAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              aria-label="Analisar Receitas"
              type="button"
              disabled={anyAnalysisLoading}
            >
              <TrendingUp className="w-5 h-5" />
              Receitas
          </button>
          </Tooltip>
          <Tooltip text="Análise detalhada das suas despesas.">
          <button
              onClick={() => { setSelectedAnalysis('despesas'); loadDespesasAnalysis(getDadosFinanceiros()); }}
              className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-200 ${anyAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              aria-label="Analisar Despesas"
              type="button"
              disabled={anyAnalysisLoading}
            >
              <TrendingDown className="w-5 h-5" />
              Despesas
          </button>
          </Tooltip>
          <Tooltip text="Gere relatórios inteligentes e estratégicos.">
            <button
              onClick={() => { setSelectedAnalysis('relatorios'); loadRelatoriosInteligentes(getDadosFinanceiros()); }}
              className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-200 ${anyAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              aria-label="Gerar Relatórios Inteligentes"
              type="button"
              disabled={anyAnalysisLoading}
            >
              <BarChart3 className="w-5 h-5" />
              Relatórios
            </button>
          </Tooltip>
        </div>
        {/* Resultado da análise selecionada */}
        <div className="mt-6 w-full flex justify-center">
          <div className="w-full max-w-2xl">
            {selectedAnalysis === 'insights' && (
              loadingInsights ? (
                <div className="flex items-center justify-center space-x-3 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="text-gray-600 dark:text-gray-300 text-lg">Analisando suas finanças com IA...</span>
      </div>
              ) : aiInsights.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 w-full mt-2">
                  {aiInsights.map((insight, index) => {
                    const styleConfig = {
                      positivo: {
                        border: 'border-l-4 border-green-400',
                        iconBg: 'bg-green-100 dark:bg-green-900/40',
                        icon: 'text-green-600 dark:text-green-400',
                        text: 'text-green-800 dark:text-green-200'
                      },
                      atencao: {
                        border: 'border-l-4 border-yellow-400',
                        iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
                        icon: 'text-yellow-600 dark:text-yellow-400',
                        text: 'text-yellow-800 dark:text-yellow-200'
                      },
                      informativo: {
                        border: 'border-l-4 border-blue-400',
                        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
                        icon: 'text-blue-600 dark:text-blue-400',
                        text: 'text-blue-800 dark:text-blue-200'
                      },
                    };
                    const currentStyle = styleConfig[insight.type] || styleConfig.informativo;
                    const IconComponent = getIconComponent(insight.icon);
          return (
                      <div key={index} className={`relative min-w-[180px] min-h-[80px] p-3 rounded-xl bg-white dark:bg-gray-900 border ${currentStyle.border} shadow-sm flex flex-col items-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}>
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStyle.iconBg} absolute -top-4 left-1/2 -translate-x-1/2 shadow-md`}>
                          <IconComponent className={`w-5 h-5 ${currentStyle.icon}`} />
                      </span>
                        <h4 className={`font-bold mt-5 mb-1 text-center ${currentStyle.text}`}>{insight.title}</h4>
                        <p className={`text-xs text-center ${currentStyle.text}`}>{insight.description}</p>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">Clique em <b>Insights</b> para gerar uma análise inteligente.</div>
              )
            )}
            {selectedAnalysis === 'dicas' && (
              loadingTips ? (
                <div className="flex items-center justify-center space-x-3 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                  <span className="text-gray-600 dark:text-gray-300 text-lg">Gerando dicas financeiras...</span>
                </div>
              ) : financialTips.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 w-full mt-2">
                  {financialTips.map((tip, index) => {
                    const styleConfig = {
                      positivo: {
                        border: 'border-l-4 border-green-400',
                        iconBg: 'bg-green-100 dark:bg-green-900/40',
                        icon: 'text-green-600 dark:text-green-400',
                        text: 'text-green-800 dark:text-green-200'
                      },
                      atencao: {
                        border: 'border-l-4 border-yellow-400',
                        iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
                        icon: 'text-yellow-600 dark:text-yellow-400',
                        text: 'text-yellow-800 dark:text-yellow-200'
                      },
                      informativo: {
                        border: 'border-l-4 border-blue-400',
                        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
                        icon: 'text-blue-600 dark:text-blue-400',
                        text: 'text-blue-800 dark:text-blue-200'
                      },
                    };
                    const currentStyle = styleConfig[tip.type] || styleConfig.informativo;
                    const IconComponent = getIconComponent(tip.icon);
                    return (
                      <div key={index} className={`relative min-w-[180px] min-h-[80px] p-3 rounded-xl bg-white dark:bg-gray-900 border ${currentStyle.border} shadow-sm flex flex-col items-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}>
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStyle.iconBg} absolute -top-4 left-1/2 -translate-x-1/2 shadow-md`}>
                          <IconComponent className={`w-5 h-5 ${currentStyle.icon}`} />
                        </span>
                        <h4 className={`font-bold mt-5 mb-1 text-center ${currentStyle.text}`}>{tip.title}</h4>
                        <p className={`text-xs text-center ${currentStyle.text}`}>{tip.description}</p>
                </div>
                    );
                  })}
              </div>
              ) : (
                <div className="text-gray-500 text-center py-8">Clique em <b>Dicas</b> para receber sugestões financeiras.</div>
              )
            )}
            {selectedAnalysis === 'receitas' && (
              loadingReceitas ? (
                <div className="flex items-center justify-center space-x-3 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="text-gray-600 dark:text-gray-300 text-lg">Analisando suas receitas...</span>
                </div>
              ) : receitasAnalysis.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 w-full mt-2">
                  {receitasAnalysis.map((analysis, index) => {
                    const styleConfig = {
                      positivo: {
                        border: 'border-l-4 border-green-400',
                        iconBg: 'bg-green-100 dark:bg-green-900/40',
                        icon: 'text-green-600 dark:text-green-400',
                        text: 'text-green-800 dark:text-green-200'
                      },
                      atencao: {
                        border: 'border-l-4 border-yellow-400',
                        iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
                        icon: 'text-yellow-600 dark:text-yellow-400',
                        text: 'text-yellow-800 dark:text-yellow-200'
                      },
                      informativo: {
                        border: 'border-l-4 border-blue-400',
                        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
                        icon: 'text-blue-600 dark:text-blue-400',
                        text: 'text-blue-800 dark:text-blue-200'
                      },
                    };
                    const currentStyle = styleConfig[analysis.type] || styleConfig.informativo;
                    const IconComponent = getIconComponent(analysis.icon);
                    return (
                      <div key={index} className={`relative min-w-[180px] min-h-[80px] p-3 rounded-xl bg-white dark:bg-gray-900 border ${currentStyle.border} shadow-sm flex flex-col items-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}>
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStyle.iconBg} absolute -top-4 left-1/2 -translate-x-1/2 shadow-md`}>
                          <IconComponent className={`w-5 h-5 ${currentStyle.icon}`} />
                        </span>
                        <h4 className={`font-bold mt-5 mb-1 text-center ${currentStyle.text}`}>{analysis.title}</h4>
                        <p className={`text-xs text-center ${currentStyle.text}`}>{analysis.description}</p>
            </div>
          );
        })}
      </div>
              ) : (
                <div className="text-gray-500 text-center py-8">Clique em <b>Receitas</b> para analisar suas receitas.</div>
              )
            )}
            {selectedAnalysis === 'despesas' && (
              loadingDespesas ? (
                <div className="flex items-center justify-center space-x-3 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="text-gray-600 dark:text-gray-300 text-lg">Analisando suas despesas...</span>
        </div>
              ) : despesasAnalysis.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 w-full mt-2">
                  {despesasAnalysis.map((analysis, index) => {
                    const styleConfig = {
                      positivo: {
                        border: 'border-l-4 border-green-400',
                        iconBg: 'bg-green-100 dark:bg-green-900/40',
                        icon: 'text-green-600 dark:text-green-400',
                        text: 'text-green-800 dark:text-green-200'
                      },
                      atencao: {
                        border: 'border-l-4 border-yellow-400',
                        iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
                        icon: 'text-yellow-600 dark:text-yellow-400',
                        text: 'text-yellow-800 dark:text-yellow-200'
                      },
                      informativo: {
                        border: 'border-l-4 border-blue-400',
                        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
                        icon: 'text-blue-600 dark:text-blue-400',
                        text: 'text-blue-800 dark:text-blue-200'
                      },
                    };
                    const currentStyle = styleConfig[analysis.type] || styleConfig.informativo;
                    const IconComponent = getIconComponent(analysis.icon);
                    return (
                      <div key={index} className={`relative min-w-[180px] min-h-[80px] p-3 rounded-xl bg-white dark:bg-gray-900 border ${currentStyle.border} shadow-sm flex flex-col items-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}>
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStyle.iconBg} absolute -top-4 left-1/2 -translate-x-1/2 shadow-md`}>
                          <IconComponent className={`w-5 h-5 ${currentStyle.icon}`} />
                        </span>
                        <h4 className={`font-bold mt-5 mb-1 text-center ${currentStyle.text}`}>{analysis.title}</h4>
                        <p className={`text-xs text-center ${currentStyle.text}`}>{analysis.description}</p>
                      </div>
                    );
                  })}
            </div>
          ) : (
                <div className="text-gray-500 text-center py-8">Clique em <b>Despesas</b> para analisar suas despesas.</div>
              )
            )}
            {selectedAnalysis === 'relatorios' && (
              loadingRelatorios ? (
                <div className="flex items-center justify-center space-x-3 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                  <span className="text-gray-600 dark:text-gray-300 text-lg">Gerando relatórios inteligentes...</span>
                </div>
              ) : relatoriosInteligentes.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 w-full mt-2">
                  {relatoriosInteligentes.map((relatorio, index) => {
                const styleConfig = {
                  positivo: {
                        border: 'border-l-4 border-green-400',
                        iconBg: 'bg-green-100 dark:bg-green-900/40',
                    icon: 'text-green-600 dark:text-green-400',
                    text: 'text-green-800 dark:text-green-200'
                  },
                  atencao: {
                        border: 'border-l-4 border-yellow-400',
                        iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
                    icon: 'text-yellow-600 dark:text-yellow-400',
                    text: 'text-yellow-800 dark:text-yellow-200'
                  },
                  informativo: {
                        border: 'border-l-4 border-blue-400',
                        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
                    icon: 'text-blue-600 dark:text-blue-400',
                    text: 'text-blue-800 dark:text-blue-200'
                  },
                };
                    const currentStyle = styleConfig[relatorio.type] || styleConfig.informativo;
                    const IconComponent = getIconComponent(relatorio.icon);
                return (
                      <div key={index} className={`relative min-w-[180px] min-h-[80px] p-3 rounded-xl bg-white dark:bg-gray-900 border ${currentStyle.border} shadow-sm flex flex-col items-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}>
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStyle.iconBg} absolute -top-4 left-1/2 -translate-x-1/2 shadow-md`}>
                          <IconComponent className={`w-5 h-5 ${currentStyle.icon}`} />
                        </span>
                        <h4 className={`font-bold mt-5 mb-1 text-center ${currentStyle.text}`}>{relatorio.title}</h4>
                        <p className={`text-xs text-center ${currentStyle.text}`}>{relatorio.description}</p>
                  </div>
                );
                  })}
            </div>
              ) : (
                <div className="text-gray-500 text-center py-8">Clique em <b>Relatórios</b> para gerar relatórios inteligentes.</div>
              )
          )}
        </div>
      </div>
      </div>
    </div>
  );

  return (
    <PageTemplate
        title="Dashboard Financeiro"
        subtitle="Visão completa das suas finanças"
        headerActions={
          <div className="flex items-center gap-2 ml-auto">
            {/* Período */}
            <div className="relative min-w-[150px]">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="pl-8 pr-4 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition h-10 min-h-[40px] max-h-[40px] min-w-[150px] appearance-none hover:ring-1 hover:ring-blue-200 shadow-sm"
                title="Período"
                style={{justifyContent: 'flex-start', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'}}
              >
                <option value="month">Este mês</option>
                <option value="quarter">Últimos 3 meses</option>
                <option value="year">Este ano</option>
              </select>
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            {/* Contas */}
            <div className="relative min-w-[150px]">
              <MultiSelectDropdown
                label="Todas as Contas"
                options={data.contas.map(c => ({ value: c.id, label: c.nome }))}
                selected={selectedContas}
                onChange={setSelectedContas}
                iconLeft={<Wallet className="w-4 h-4 text-gray-400" />}
                className=""
                title="Contas"
                summaryFn={(selected, options) => selected.length === options.length ? 'Todas as Contas' : selected.length === 1 ? (options.find(o => o.value === selected[0])?.label ?? 'Selecionado') : `${selected.length} selecionadas`}
              />
            </div>
            {/* Categorias */}
            <div className="relative min-w-[150px]">
              <MultiSelectDropdown
                label="Todas as Categorias"
                options={data.categorias.map(c => ({ value: c.id, label: c.nome }))}
                selected={selectedCategorias}
                onChange={setSelectedCategorias}
                iconLeft={<PieChartIcon className="w-4 h-4 text-gray-400" />}
                className=""
                title="Categorias"
                summaryFn={(selected, options) => selected.length === options.length ? 'Todas as Categorias' : selected.length === 1 ? (options.find(o => o.value === selected[0])?.label ?? 'Selecionado') : `${selected.length} selecionadas`}
              />
            </div>
          </div>
        }
      >
        {analysisModal}
        {/* Ações Rápidas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">⚡ Ações Rápidas</h2>
            <button
              onClick={() => setShowAnalysisModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-label="Abrir Análises Inteligentes"
              type="button"
            >
              <Zap className="w-5 h-5" />
              Análises Inteligentes
            </button>
          </div>
          <div className="grid grid-cols-4 gap-x-4 gap-y-3 lg:gap-x-6 lg:gap-y-4">
            <button
              className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group w-full h-full"
              onClick={() => onNavigate && onNavigate('lancamentos')}
            >
              <Tooltip text="Adicionar um novo lançamento (receita ou despesa)" position="top">
                <span className="flex flex-row items-center justify-center gap-x-4 w-full h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus w-10 h-10 text-blue-600 group-hover:scale-110 transition-transform block"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                  <span className="text-lg font-medium text-blue-700 dark:text-blue-300 text-left leading-tight">Novo Lançamento</span>
                </span>
              </Tooltip>
            </button>
            <button
              className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 group w-full h-full"
              onClick={() => onNavigate && onNavigate('transferencias')}
            >
              <Tooltip text="Transferir valores entre contas" position="top">
                <span className="flex flex-row items-center justify-center gap-x-4 w-full h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left-right w-10 h-10 text-green-600 group-hover:scale-110 transition-transform block"><path d="M8 3 4 7l4 4"></path><path d="M4 7h16"></path><path d="m16 21 4-4-4-4"></path><path d="M20 17H4"></path></svg>
                  <span className="text-lg font-medium text-green-700 dark:text-green-300 text-left leading-tight">Transferência</span>
                </span>
              </Tooltip>
            </button>
            <button
              className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all duration-200 group w-full h-full"
              onClick={() => onNavigate && onNavigate('relatorios')}
            >
              <Tooltip text="Visualizar relatórios financeiros detalhados" position="top">
                <span className="flex flex-row items-center justify-center gap-x-4 w-full h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart3 w-10 h-10 text-purple-600 group-hover:scale-110 transition-transform block"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
                  <span className="text-lg font-medium text-purple-700 dark:text-purple-300 text-left leading-tight">Relatórios</span>
                </span>
              </Tooltip>
            </button>
            <button
              className="p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl transition-all duration-200 group w-full h-full"
              onClick={() => onNavigate && onNavigate('metas')}
            >
              <Tooltip text="Gerenciar e acompanhar suas metas financeiras" position="top">
                <span className="flex flex-row items-center justify-center gap-x-4 w-full h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-target w-10 h-10 text-orange-600 group-hover:scale-110 transition-transform block"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                  <span className="text-lg font-medium text-orange-700 dark:text-orange-300 text-left leading-tight">Metas</span>
                </span>
              </Tooltip>
            </button>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          {data.kpis.map((kpi, idx) => {
            const IconComponent = getIconComponent(kpi.icon || 'DollarSign');
            const trendColor = kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-blue-600';
            const trendBg = kpi.trend === 'up' ? 'bg-green-50 dark:bg-green-900/20' : kpi.trend === 'down' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20';
            return (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{kpi.label}</p>
                    <p className={`text-2xl lg:text-3xl font-bold ${kpi.color} dark:${kpi.color?.replace('text-', 'text-')}`}>{valoresOfuscados ? '•••••' : kpi.value}</p>
                      <div className="flex items-center space-x-1 mt-2">
                        {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                        {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                        {kpi.trend === 'stable' && <div className="w-4 h-4" />}
                      <span className={`text-xs font-medium ${trendColor} dark:${trendColor.replace('text-', 'text-')}`}>{kpi.trend === 'up' ? 'Positivo' : kpi.trend === 'down' ? 'Negativo' : 'Estável'}</span>
                      </div>
                  </div>
                  <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center ${trendBg}`}>
                    <IconComponent className={`w-6 h-6 lg:w-7 lg:h-7 ${trendColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gráficos, Parcelas e Últimos Lançamentos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {/* Gráfico de Despesas por Categoria */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 lg:p-8 min-h-[340px] flex flex-col animate-in transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Despesas por Categoria</h3>
          {dadosGraficoPizza.length > 0 ? (
            <div className="w-full flex-1 flex flex-col">
              <div className="h-48 sm:h-64 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGraficoPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="valor"
                      nameKey="nome"
                    >
                      {dadosGraficoPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                      <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full">
                <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-2 pr-2">
                  {dadosGraficoPizza.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }} />
                        <span className="text-gray-700 dark:text-gray-300 truncate font-medium">{item.nome || 'Despesa sem nome'}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                          <div className={`font-semibold text-gray-900 dark:text-white`}>
                            {valoresOfuscados ? '•••••' : formatCurrency(item.valor)}
                          </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.porcentagem.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <PieChartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Nenhuma despesa encontrada neste período</p>
              </div>
            </div>
          )}
        </div>
          {/* Parcelas de Cartão de Crédito do Mês Vigente */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 lg:p-8 min-h-[340px] flex flex-col animate-in transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Parcelas do Cartão de Crédito deste mês</h3>
            <div className="space-y-3 flex-1">
              {(() => {
                // Agrupar por compra_parcelada_id
                const hoje = new Date();
                const mesAtual = hoje.getMonth();
                const anoAtual = hoje.getFullYear();
                // Filtrar todas as despesas parceladas do cartão
                const todasParceladas = data.lancamentos.filter(l =>
                  l.tipo === 'DESPESA' &&
                  l.status === 'CONFIRMADO' &&
                  l.cartao_credito_usado &&
                  l.total_parcelas && l.total_parcelas > 1 &&
                  l.compra_parcelada_id
                );
                // Para cada compra_parcelada_id, pegar a parcela do mês vigente (se existir)
                const parcelasDoMes: typeof todasParceladas = [];
                const agrupadas: Record<string, boolean> = {};
                todasParceladas.forEach(l => {
                  const dataParcela = new Date(l.data);
                  if (
                    dataParcela.getMonth() === mesAtual &&
                    dataParcela.getFullYear() === anoAtual &&
                    !agrupadas[l.compra_parcelada_id!]
                  ) {
                    parcelasDoMes.push(l);
                    agrupadas[l.compra_parcelada_id!] = true;
                  }
                });
                if (parcelasDoMes.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <CreditCard className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-center">Nenhuma parcela de cartão de crédito para pagar neste mês.</p>
                    </div>
                  );
                }
                return parcelasDoMes.map((parcela, idx) => {
                  // Encontrar todas as parcelas dessa compra
                  const todasParcelas = data.lancamentos.filter(l => l.compra_parcelada_id === parcela.compra_parcelada_id);
                  const valorTotal = todasParcelas.reduce((sum, p) => sum + p.valor, 0);
                  return (
                    <div key={parcela.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-gray-700 dark:text-white" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {parcela.descricao.replace(/ \(\d+\/\d+\)$/, '')} ({parcela.parcela_atual}/{parcela.total_parcelas})
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-semibold text-gray-900 dark:text-white`}>
                          Parcela: {valoresOfuscados ? '•••••' : formatCurrency(parcela.valor)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-300">
                          Total: {valoresOfuscados ? '•••••' : formatCurrency(valorTotal)}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
        </div>
        {/* Últimos Lançamentos */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 lg:p-8 min-h-[340px] flex flex-col animate-in transition-all duration-300 hover:scale-105 hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Últimos Lançamentos</h3>
              <button onClick={() => onNavigate?.('lancamentos')} className="text-base text-blue-600 hover:text-blue-700 flex items-center space-x-1 btn-hover font-semibold">
                <Eye className="w-5 h-5" />
              <span>Ver todos</span>
            </button>
          </div>
          {(() => {
            // Agrupar lançamentos por compra_parcelada_id
            const agrupados: Record<string, any> = {};
            const ultimos: any[] = [];
            data.lancamentos.forEach(lancamento => {
              if (lancamento.compra_parcelada_id && lancamento.total_parcelas > 1) {
                if (!agrupados[lancamento.compra_parcelada_id]) {
                  // Pega todas as parcelas dessa compra
                  const todasParcelas = data.lancamentos.filter(l => l.compra_parcelada_id === lancamento.compra_parcelada_id);
                  // Busca a parcela de menor data (primeira da compra)
                  let primeiraParcela = todasParcelas[0];
                  todasParcelas.forEach(p => {
                    if (new Date(p.data) < new Date(primeiraParcela.data)) primeiraParcela = p;
                  });
                  // Corrigir: valor total é a soma de todas as parcelas
                  const valorTotalCompra = todasParcelas.map(p => Number(p.valor)).reduce((sum, v) => sum + v, 0);
                  // Log para depuração
                  console.log('Compra parcelada:', primeiraParcela.descricao, 'Valor total:', valorTotalCompra, 'Parcelas:', todasParcelas.map(p => p.valor));
                  ultimos.push({ ...primeiraParcela, valorTotal: valorTotalCompra, isParcela: true });
                  agrupados[lancamento.compra_parcelada_id] = true;
                }
              } else {
                ultimos.push({ ...lancamento, isParcela: false });
              }
            });
            // Ordenar por data da compra (primeira parcela) decrescente
            ultimos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
            if (ultimos.length === 0) {
              return (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8 flex-1 flex flex-col justify-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>Nenhum lançamento encontrado</p>
                </div>
              );
            }
            return (
              <div className="space-y-3 flex-1">
                {ultimos.slice(0, 5).map((lancamento) => {
                  const categoria = data.categorias.find(c => c.id === lancamento.categoria_id);
                  const conta = data.contas.find(c => c.id === lancamento.conta_id);
                  return (
                    <div key={lancamento.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm mb-2 gap-2 sm:gap-4 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lancamento.tipo === 'RECEITA' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}> 
                          {lancamento.tipo === 'RECEITA' ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">{lancamento.descricao || 'Despesa sem descrição'}</span>
                            {lancamento.status === 'CONFIRMADO' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {lancamento.isParcela && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Compra Parcelada</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span className="truncate max-w-[80px]">{categoria?.nome || 'categoria'}</span>
                            <span>•</span>
                            <span className="truncate max-w-[80px]">{conta?.nome || 'conta'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end min-w-[90px] mt-2 sm:mt-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{lancamento.data ? formatDate(lancamento.data) : ''}</span>
                        {/* Para compras parceladas, mostrar sempre o valor total da compra (valorTotal), não o valor da parcela */}
                        <span className={`font-bold ${lancamento.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>{valoresOfuscados ? '•••••' : (lancamento.tipo === 'RECEITA' ? '+' : '-') + ' ' + formatCurrency(lancamento.isParcela ? lancamento.valorTotal : lancamento.valor)}</span>
                      </div>
                    </div>
                  );
                })}
                {data.lancamentos.length > 5 && (
                  <div className="text-center pt-2">
                    <button onClick={() => onNavigate?.('lancamentos')} className="text-sm text-blue-600 hover:text-blue-700 btn-hover">
                      Ver todos os lançamentos ({data.lancamentos.length})
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

        {/* Card de Comparação com Período Anterior */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 lg:p-8 min-h-[140px] flex flex-col animate-in transition-all duration-300 hover:scale-105 hover:shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Comparação com Mês Anterior</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Receita */}
            <Tooltip text="Receitas do período atual comparadas ao mês anterior.">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm gap-2 sm:gap-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 dark:bg-green-900/20">
                    <TrendingUp className="w-5 h-5 text-green-600" />
    </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">Receitas</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Anterior: {formatCurrency(receitasAnterior)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[90px] mt-2 sm:mt-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Variação</span>
                  <span className={`font-bold text-green-600 transition-all duration-500 ${animateReceitas ? 'animate-pulse' : ''}`}>{formatCurrency(receitasAtual)}</span>
                  <span className={`text-xs font-bold ${receitasVar >= 0 ? 'text-green-600' : 'text-red-600'} transition-transform duration-300 ${animateReceitas ? 'scale-125' : ''}`}>{receitasVar >= 0 ? '↑' : '↓'} {Math.abs(receitasVar).toFixed(1)}%</span>
                </div>
              </div>
            </Tooltip>
            {/* Despesa */}
            <Tooltip text="Despesas do período atual comparadas ao mês anterior.">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm gap-2 sm:gap-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">Despesas</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Anterior: {formatCurrency(despesasAnterior)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[90px] mt-2 sm:mt-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Variação</span>
                  <span className={`font-bold text-red-600 transition-all duration-500 ${animateDespesas ? 'animate-pulse' : ''}`}>{formatCurrency(despesasAtual)}</span>
                  <span className={`text-xs font-bold ${despesasVar >= 0 ? 'text-red-600' : 'text-green-600'} transition-transform duration-300 ${animateDespesas ? 'scale-125' : ''}`}>{despesasVar >= 0 ? '↑' : '↓'} {Math.abs(despesasVar).toFixed(1)}%</span>
                </div>
              </div>
            </Tooltip>
            {/* Saldo */}
            <Tooltip text="Saldo do período atual comparado ao mês anterior.">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm gap-2 sm:gap-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${saldoAtual >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}> 
                    <DollarSign className={`w-5 h-5 ${saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">Saldo</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Anterior: {formatCurrency(saldoAnterior)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[90px] mt-2 sm:mt-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Variação</span>
                  <span className={`font-bold ${saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'} transition-all duration-500 ${animateSaldo ? 'animate-pulse' : ''}`}>{formatCurrency(saldoAtual)}</span>
                  <span className={`text-xs font-bold ${saldoVar >= 0 ? 'text-green-600' : 'text-red-600'} transition-transform duration-300 ${animateSaldo ? 'scale-125' : ''}`}>{saldoVar >= 0 ? '↑' : '↓'} {Math.abs(saldoVar).toFixed(1)}%</span>
                </div>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Card de Alertas */}
        {alertas.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 lg:p-8 flex flex-col min-h-[120px] card-hover focus-ring animate-in transition-all duration-300 hover:scale-105 hover:shadow-lg mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight flex items-center gap-2"><AlertCircle className="w-6 h-6 text-yellow-500" /> Alertas</h3>
            <ul className="space-y-3">
              {alertas.map((a, i) => {
                const Icon = getIconComponent(a.icon);
                return (
                  <li key={i} className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 flex-shrink-0 ${a.cor}`} />
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{a.titulo}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{a.descricao}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
    </PageTemplate>
  );
}