import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Calendar, DollarSign, ArrowRight, CheckCircle, Clock, TrendingUp, TrendingDown, AlertCircle, PieChart as PieChartIcon, BarChart3, Target } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate, validatePagamentoFaturaField, validatePagamentoFaturaForm, PagamentoFaturaFormData } from '../../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PageTemplate } from '../Common/PageTemplate';

export function FaturaCartao() {
  const [contas, setContas] = useState<any[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [periodo, setPeriodo] = useState({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fim: new Date().toISOString().split('T')[0]
  });
  const [fatura, setFatura] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPagamento, setShowPagamento] = useState(false);
  const [contaOrigem, setContaOrigem] = useState('');
  const [valorPagamento, setValorPagamento] = useState('');
  const [pagamentoParcial, setPagamentoParcial] = useState(false);
  const [pagamentoErrors, setPagamentoErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadContas();
  }, []);

  useEffect(() => {
    if (contaSelecionada) {
      loadFatura();
    }
  }, [contaSelecionada, periodo]);

  const loadContas = async () => {
    try {
      const contasData = await DatabaseService.getContas();
      // Filtrar apenas contas com função crédito
      const contasComCredito = contasData.filter(c => c.limite_credito && c.limite_credito > 0);
      setContas(contasComCredito);
      
      if (contasComCredito.length > 0) {
        setContaSelecionada(contasComCredito[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFatura = async () => {
    if (!contaSelecionada) return;
    
    try {
      setLoading(true);
      const faturaData = await DatabaseService.getFaturaCartao(
        contaSelecionada,
        periodo.inicio,
        periodo.fim
      );
      setFatura(faturaData);
    } catch (error) {
      console.error('Erro ao carregar fatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePagamentoFieldChange = (field: keyof PagamentoFaturaFormData, value: any) => {
    if (field === 'contaOrigem') setContaOrigem(value);
    if (field === 'valorPagamento') setValorPagamento(value);
    const error = validatePagamentoFaturaField(field, value, { contaOrigem, valorPagamento, [field]: value });
    setPagamentoErrors(prev => ({ ...prev, [field]: error }));
  };

  const handlePagarFatura = async () => {
    const { isValid, errors } = validatePagamentoFaturaForm({ contaOrigem, valorPagamento });
    setPagamentoErrors(errors);
    if (!isValid) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
        if (el) el.focus();
      }
      return;
    }
    try {
      setLoading(true);
      const valor = parseFloat(valorPagamento.replace(/[^\d,\.]/g, '').replace(',', '.'));
      await DatabaseService.pagarFatura(
        contaSelecionada,
        contaOrigem,
        valor,
        periodo.inicio,
        periodo.fim,
        pagamentoParcial
      );
      alert('Fatura paga com sucesso!');
      setShowPagamento(false);
      setContaOrigem('');
      setValorPagamento('');
      setPagamentoParcial(false);
      setPagamentoErrors({});
      await loadFatura();
    } catch (error) {
      console.error('Erro ao pagar fatura:', error);
      alert('Erro ao pagar fatura');
    } finally {
      setLoading(false);
    }
  };

  const totalFatura = fatura.reduce((sum, item) => sum + item.valor, 0);
  const contaAtual = contas.find(c => c.id === contaSelecionada);
  const utilizacao = contaAtual?.limite_credito ? (totalFatura / contaAtual.limite_credito) * 100 : 0;

  // Dados para gráficos e KPIs
  const dadosGraficoPizza = useMemo(() => {
    if (fatura.length === 0) return [];
    
    const grupos = fatura.reduce((acc, lancamento) => {
      const categoria = lancamento.categoria?.nome || 'Sem categoria';
      if (!acc[categoria]) {
        acc[categoria] = { nome: categoria, valor: 0, cor: '#10B981' };
      }
      acc[categoria].valor += lancamento.valor;
      return acc;
    }, {} as Record<string, { nome: string; valor: number; cor: string }>);
    
    return Object.values(grupos)
      .map(grupo => ({
        ...grupo,
        porcentagem: (grupo.valor / totalFatura) * 100,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [fatura, totalFatura]);

  // Dados para gráfico de barras (evolução por dia)
  const dadosGraficoBarras = useMemo(() => {
    if (fatura.length === 0) return [];
    
    const lancamentosPorDia: Record<string, number> = {};
    fatura.forEach(l => {
      const data = l.data;
      if (!lancamentosPorDia[data]) lancamentosPorDia[data] = 0;
      lancamentosPorDia[data] += l.valor;
    });
    
    return Object.entries(lancamentosPorDia)
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [fatura]);

  // KPIs adicionais
  const kpis = useMemo(() => {
    const limiteDisponivel = contaAtual?.limite_credito ? contaAtual.limite_credito - totalFatura : 0;
    const mediaDiaria = fatura.length > 0 ? totalFatura / fatura.length : 0;
    const maiorCompra = fatura.length > 0 ? Math.max(...fatura.map(l => l.valor)) : 0;
    const comprasParceladas = fatura.filter(l => l.total_parcelas && l.total_parcelas > 1).length;
    
    return {
      limiteDisponivel,
      mediaDiaria,
      maiorCompra,
      comprasParceladas,
      totalCompras: fatura.length
    };
  }, [fatura, totalFatura, contaAtual]);

  return (
    <PageTemplate
      title="Fatura do Cartão"
      subtitle="Visualize e pague suas faturas de cartão de crédito"
      icon={CreditCard}
      loading={loading && contas.length === 0}
      emptyState={
        contas.length === 0 ? {
          icon: CreditCard,
          title: "Nenhuma conta com função crédito encontrada",
          description: "Adicione um limite de crédito a uma conta para visualizar faturas",
          action: (
            <button
              onClick={() => window.location.href = '/contas'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Criar Conta com Cartão
            </button>
          )
        } : undefined
      }
    >

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Conta com Função Crédito
            </label>
            <select
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {contas.map(conta => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome} - Limite: {formatCurrency(conta.limite_credito)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={periodo.inicio}
              onChange={(e) => setPeriodo(prev => ({ ...prev, inicio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={periodo.fim}
              onChange={(e) => setPeriodo(prev => ({ ...prev, fim: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* KPIs e Resumo da Fatura */}
      {contaAtual && (
        <div className="space-y-6">
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total da Fatura</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(totalFatura)}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Limite Disponível</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(kpis.limiteDisponivel)}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Utilização</p>
                  <p className={`text-2xl font-bold ${utilizacao > 80 ? 'text-red-600 dark:text-red-400' : utilizacao > 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {utilizacao.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de Compras</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpis.totalCompras}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* KPIs Secundários */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Média por Compra</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.mediaDiaria)}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Maior Compra</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(kpis.maiorCompra)}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compras Parceladas</p>
                  <p className="text-xl font-bold text-blue-600">{kpis.comprasParceladas}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Barra de utilização e botão de pagamento */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Utilização do Limite</h3>
              {totalFatura > 0 && (
                <button
                  onClick={() => setShowPagamento(true)}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Pagar Fatura</span>
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Utilizado: {formatCurrency(totalFatura)}</span>
                <span>Disponível: {formatCurrency(kpis.limiteDisponivel)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    utilizacao > 80 ? 'bg-red-500' : utilizacao > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(utilizacao, 100)}%` }}
                />
              </div>
              {utilizacao > 80 && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Limite próximo do esgotamento!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gráficos e Análises */}
      {fatura.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Gastos por Categoria */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos por Categoria</h3>
            {dadosGraficoPizza.length > 0 ? (
              <div className="h-64">
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
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <PieChartIcon className="w-12 h-12 text-gray-300" />
                <p className="ml-2">Nenhum dado para exibir</p>
              </div>
            )}
          </div>

          {/* Gráfico de Barras - Evolução por Dia */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução dos Gastos</h3>
            {dadosGraficoBarras.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoBarras}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(value) => formatDate(value)}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => formatDate(label)}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Bar dataKey="valor" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <BarChart3 className="w-12 h-12 text-gray-300" />
                <p className="ml-2">Nenhum dado para exibir</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de Lançamentos da Fatura */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Lançamentos da Fatura ({fatura.length})
          </h2>
        </div>
        
        <div className="p-6">
          {fatura.length > 0 ? (
            <div className="space-y-3">
              {fatura.map((lancamento) => (
                <div key={lancamento.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{lancamento.descricao}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(lancamento.data)}</span>
                        <span>•</span>
                        <span>{lancamento.categoria?.nome}</span>
                        {lancamento.cartao_credito_usado && (
                          <>
                            <span>•</span>
                            <span>{lancamento.cartao_credito_usado}</span>
                          </>
                        )}
                        {lancamento.total_parcelas && lancamento.total_parcelas > 1 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">Parcelado ({lancamento.parcela_atual}/{lancamento.total_parcelas})</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(lancamento.valor)}
                      </p>
                      <div className="flex items-center space-x-1">
                        {lancamento.status === 'CONFIRMADO' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-600" />
                        )}
                        <span className="text-xs text-gray-500">{lancamento.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
              <p className="text-sm mt-1">Não há gastos no crédito para o período selecionado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showPagamento && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pagamento da Fatura</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Conta de Origem *</label>
                <select
                  name="contaOrigem"
                  value={contaOrigem}
                  onChange={e => handlePagamentoFieldChange('contaOrigem', e.target.value)}
                  onBlur={e => handlePagamentoFieldChange('contaOrigem', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${pagamentoErrors.contaOrigem ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">Selecione a conta</option>
                  {contas.filter(c => c.id !== contaSelecionada).map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                {pagamentoErrors.contaOrigem && <span className="text-red-500 text-xs mt-1 block">{pagamentoErrors.contaOrigem}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Valor do Pagamento *</label>
                <input
                  type="text"
                  name="valorPagamento"
                  value={valorPagamento}
                  onChange={e => handlePagamentoFieldChange('valorPagamento', e.target.value)}
                  onBlur={e => handlePagamentoFieldChange('valorPagamento', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${pagamentoErrors.valorPagamento ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="R$ 0,00"
                />
                {pagamentoErrors.valorPagamento && <span className="text-red-500 text-xs mt-1 block">{pagamentoErrors.valorPagamento}</span>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pagamentoParcial"
                  checked={pagamentoParcial}
                  onChange={e => setPagamentoParcial(e.target.checked)}
                />
                <label htmlFor="pagamentoParcial" className="text-sm text-gray-700 dark:text-gray-200">Pagamento Parcial</label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => { setShowPagamento(false); setPagamentoErrors({}); }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                  onClick={handlePagarFatura}
                >
                  Pagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}