import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, DollarSign, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';

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

  const handlePagarFatura = async () => {
    if (!contaOrigem || !valorPagamento) {
      alert('Selecione a conta de origem e informe o valor');
      return;
    }

    try {
      setLoading(true);
      const valor = parseFloat(valorPagamento.replace(/[^\d,]/g, '').replace(',', '.'));
      
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

  if (loading && contas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (contas.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-900">Nenhuma conta com função crédito encontrada</p>
        <p className="text-sm text-gray-500 mt-1">Adicione um limite de crédito a uma conta para visualizar faturas</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fatura do Cartão</h1>
        <p className="text-gray-600 mt-2">Visualize e pague suas faturas de cartão de crédito</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conta com Função Crédito
            </label>
            <select
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {contas.map(conta => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome} - Limite: {formatCurrency(conta.limite_credito)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={periodo.inicio}
              onChange={(e) => setPeriodo(prev => ({ ...prev, inicio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={periodo.fim}
              onChange={(e) => setPeriodo(prev => ({ ...prev, fim: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Resumo da Fatura */}
      {contaAtual && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Resumo da Fatura</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalFatura)}</div>
              <div className="text-sm text-gray-600">Total da Fatura</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(contaAtual.limite_credito)}</div>
              <div className="text-sm text-gray-600">Limite Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(contaAtual.limite_credito - totalFatura)}
              </div>
              <div className="text-sm text-gray-600">Limite Disponível</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${utilizacao > 80 ? 'text-red-600' : utilizacao > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                {utilizacao.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Utilização</div>
            </div>
          </div>

          {/* Barra de utilização */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  utilizacao > 80 ? 'bg-red-500' : utilizacao > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(utilizacao, 100)}%` }}
              />
            </div>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pagar Fatura</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conta de Origem *
                </label>
                <select
                  value={contaOrigem}
                  onChange={(e) => setContaOrigem(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione a conta</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} - {formatCurrency(conta.saldo_atual)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do Pagamento *
                </label>
                <input
                  type="text"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={formatCurrency(totalFatura)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total da fatura: {formatCurrency(totalFatura)}
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pagamentoParcial"
                  checked={pagamentoParcial}
                  onChange={(e) => setPagamentoParcial(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="pagamentoParcial" className="ml-2 text-sm text-gray-700">
                  Pagamento parcial
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPagamento(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePagarFatura}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Pagar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}