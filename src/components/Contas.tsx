import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit3, Trash2, CreditCard, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { DatabaseService } from '../lib/database';
import { AuthService, AuthUser } from '../lib/auth';
import { formatCurrency, validateContaField, validateContaForm, ContaFormData } from '../lib/utils';
import { CurrencyInput } from './Common/CurrencyInput';
import { ConfirmModal } from './Common/ConfirmModal';
import { PageTemplate } from './Common/PageTemplate';

export function Contas({ showToast, user }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void, user: AuthUser | null }) {
  if (!user) {
    return <div className="flex items-center justify-center h-64 text-gray-600 dark:text-gray-300">Carregando usuário...</div>;
  }
  const [contas, setContas] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConta, setEditingConta] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContaFormData>({
    nome: '',
    tipo: 'CORRENTE' as 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA',
    saldo_inicial: 0,
    limite_credito: 0,
    valor_investido: 0,
    banco: '',
    agencia: '',
    conta: '',
    cor: '#10B981',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contasData, lancamentosData] = await Promise.all([
        DatabaseService.getContas(),
        DatabaseService.getLancamentos()
      ]);
      setContas(contasData);
      setLancamentos(lancamentosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof ContaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const error = validateContaField(field, value, { ...formData, [field]: value });
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateContaForm(formData);
    setFormErrors(errors);
    if (!isValid) {
      // Foco automático no primeiro campo com erro
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
        if (el) el.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const contaData = {
        user_id: user.id,
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        saldo_inicial: formData.saldo_inicial,
        limite_credito: formData.limite_credito > 0 ? formData.limite_credito : null,
        valor_investido: formData.valor_investido > 0 ? formData.valor_investido : null,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        cor: formData.cor,
      };
      let id: string | null = null;
      if (editingConta) {
        await DatabaseService.updateConta(editingConta, contaData);
        id = editingConta;
        await loadData();
        resetForm();
        showToast('Conta atualizada com sucesso!', 'success');
      } else {
        const nova = await DatabaseService.createConta(contaData);
        id = nova.id;
        await loadData();
        resetForm();
        showToast('Conta criada com sucesso!', 'success');
      }
      if (id) {
        setHighlightedId(id);
        setTimeout(() => setHighlightedId(null), 2000);
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      showToast('Erro ao salvar conta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (conta: any) => {
    setEditingConta(conta.id);
    setFormData({
      nome: conta.nome,
      tipo: conta.tipo,
      saldo_inicial: conta.saldo_inicial,
      limite_credito: conta.limite_credito || 0,
      valor_investido: conta.valor_investido || 0,
      banco: conta.banco || '',
      agencia: conta.agencia || '',
      conta: conta.conta || '',
      cor: conta.cor,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const hasTransactions = lancamentos.some(l => l.conta_id === id);
    if (hasTransactions) {
      showToast('Não é possível excluir uma conta que possui lançamentos vinculados.', 'error');
      return;
    }
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await DatabaseService.deleteConta(confirmDeleteId);
      await loadData();
      showToast('Conta excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      showToast('Erro ao excluir conta', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'CORRENTE',
      saldo_inicial: 0,
      limite_credito: 0,
      valor_investido: 0,
      banco: '',
      agencia: '',
      conta: '',
      cor: '#10B981',
    });
    setFormErrors({});
    setShowForm(false);
    setEditingConta(null);
  };

  const contasComCalculos = useMemo(() => {
    return contas.map(conta => {
      const transacoesConta = lancamentos.filter(l => l.conta_id === conta.id);
      
      const receitasTotal = transacoesConta
        .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
        .reduce((sum, l) => sum + (l.valor || 0), 0);
      
      const despesasTotal = transacoesConta
        .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      // Fatura Atual: apenas parcelas do mês vigente
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const faturaAtual = transacoesConta
        .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO' && l.cartao_credito_usado && l.data && new Date(l.data).getMonth() === mesAtual && new Date(l.data).getFullYear() === anoAtual)
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      // Utilização do Limite: todas as parcelas futuras (status CONFIRMADO)
      const hojeISO = hoje.toISOString().split('T')[0];
      const utilizacaoLimite = transacoesConta
        .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO' && l.cartao_credito_usado && l.data && l.data >= hojeISO)
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      let limiteRestante = null;
      let utilizacaoPercentual = null;
      
      if (conta.limite_credito && conta.limite_credito > 0) {
        limiteRestante = conta.limite_credito - utilizacaoLimite;
        utilizacaoPercentual = (utilizacaoLimite / conta.limite_credito) * 100;
      }
      
      return {
        ...conta,
        transacoesCount: transacoesConta.length,
        receitasTotal,
        despesasTotal,
        gastosCartao: faturaAtual, // Fatura do mês vigente
        limiteRestante,
        utilizacaoPercentual
      };
    });
  }, [contas, lancamentos]);

  const resumoGeral = useMemo(() => {
    const saldoTotalInicial = contas.reduce((sum, conta) => sum + (conta.saldo_inicial || 0), 0);
    const saldoTotalAtual = contas.reduce((sum, conta) => sum + (conta.saldo_atual || 0), 0);
    const totalReceitas = contasComCalculos.reduce((sum, conta) => sum + (conta.receitasTotal || 0), 0);
    const totalDespesas = contasComCalculos.reduce((sum, conta) => sum + (conta.despesasTotal || 0), 0);
    const totalInvestido = contas.reduce((sum, conta) => sum + (conta.valor_investido || 0), 0);
    const totalLimiteCredito = contas.reduce((sum, conta) => sum + (conta.limite_credito || 0), 0);
    const totalUsadoCartao = contasComCalculos.reduce((sum, conta) => sum + (conta.gastosCartao || 0), 0);
    const limiteDisponivelCartao = totalLimiteCredito - totalUsadoCartao;
    
    return {
      saldoTotalInicial,
      saldoTotalAtual,
      totalReceitas,
      totalDespesas,
      totalInvestido,
      totalLimiteCredito,
      totalUsadoCartao,
      limiteDisponivelCartao,
      variacao: saldoTotalAtual - saldoTotalInicial
    };
  }, [contas, contasComCalculos]);

  return (
    <PageTemplate
      title="Contas"
      subtitle="Gerencie suas contas bancárias e carteiras"
      icon={CreditCard}
      loading={loading}
      headerActions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Conta</span>
        </button>
      }
      emptyState={
        contas.length === 0 ? {
          icon: CreditCard,
          title: "Nenhuma conta encontrada",
          description: "Comece criando sua primeira conta para gerenciar suas finanças.",
          action: (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </button>
          )
        } : undefined
      }
    >

      {/* Resumo Geral */}
      {contas.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${resumoGeral.saldoTotalAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(resumoGeral.saldoTotalAtual)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Saldo Líquido Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(resumoGeral.totalReceitas)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Receitas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(resumoGeral.totalDespesas)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Despesas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(resumoGeral.totalInvestido)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Investido</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(resumoGeral.totalLimiteCredito)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Limite Total Cartões</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${resumoGeral.limiteDisponivelCartao >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(resumoGeral.limiteDisponivelCartao)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Limite Disponível</div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nome da Conta *
                </label>
                <input
                  type="text"
                  name="nome"
                  id="nome"
                  value={formData.nome}
                  onChange={e => handleFieldChange('nome', e.target.value)}
                  onBlur={e => handleFieldChange('nome', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.nome ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Ex: Conta Corrente, Poupança..."
                />
                {formErrors.nome && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="nome-error">{formErrors.nome}</p>
                )}
              </div>

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tipo da Conta *
                </label>
                <select
                  name="tipo"
                  id="tipo"
                  value={formData.tipo}
                  onChange={e => handleFieldChange('tipo', e.target.value as any)}
                  onBlur={e => handleFieldChange('tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="INVESTIMENTO">Investimento</option>
                  <option value="CARTEIRA">Carteira</option>
                </select>
                {formErrors.tipo && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="tipo-error">{formErrors.tipo}</p>
                )}
              </div>

              <div>
                <label htmlFor="saldo_inicial" className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Inicial *
                </label>
                <CurrencyInput
                  name="saldo_inicial"
                  id="saldo_inicial"
                  value={formData.saldo_inicial}
                  onChange={value => handleFieldChange('saldo_inicial', value)}
                  onBlur={e => handleFieldChange('saldo_inicial', formData.saldo_inicial)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.saldo_inicial ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="R$ 0,00"
                  error={!!formErrors.saldo_inicial}
                  required
                />
                {formErrors.saldo_inicial && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="saldo_inicial-error">{formErrors.saldo_inicial}</p>
                )}
              </div>

              <div>
                <label htmlFor="limite_credito" className="block text-sm font-medium text-gray-700 mb-1">
                  Limite de Crédito (Opcional)
                </label>
                <CurrencyInput
                  name="limite_credito"
                  id="limite_credito"
                  value={formData.limite_credito}
                  onChange={value => handleFieldChange('limite_credito', value)}
                  onBlur={e => handleFieldChange('limite_credito', formData.limite_credito)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.limite_credito ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="R$ 0,00"
                  error={!!formErrors.limite_credito}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Informe se esta conta possui função de crédito (cartão)
                </p>
                {formErrors.limite_credito && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="limite_credito-error">{formErrors.limite_credito}</p>
                )}
              </div>

              <div>
                <label htmlFor="valor_investido" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Investido (Opcional)
                </label>
                <CurrencyInput
                  name="valor_investido"
                  id="valor_investido"
                  value={formData.valor_investido}
                  onChange={value => handleFieldChange('valor_investido', value)}
                  onBlur={e => handleFieldChange('valor_investido', formData.valor_investido)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.valor_investido ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="R$ 0,00"
                  error={!!formErrors.valor_investido}
                />
                {formErrors.valor_investido && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="valor_investido-error">{formErrors.valor_investido}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="banco" className="block text-sm font-medium text-gray-700 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    name="banco"
                    id="banco"
                    value={formData.banco}
                    onChange={e => handleFieldChange('banco', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
                
                <div>
                  <label htmlFor="agencia" className="block text-sm font-medium text-gray-700 mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    name="agencia"
                    id="agencia"
                    value={formData.agencia}
                    onChange={e => handleFieldChange('agencia', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="0000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="conta" className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Conta
                </label>
                <input
                  type="text"
                  name="conta"
                  id="conta"
                  value={formData.conta}
                  onChange={e => handleFieldChange('conta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="00000-0"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center"><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>Salvando...</span>
                  ) : (
                    editingConta ? 'Salvar' : 'Criar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Contas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Suas Contas</h2>
        </div>
        
        <div className="p-6">
          {contasComCalculos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {contasComCalculos.map((conta) => {
                return (
                  <div
                    key={conta.id}
                    className={`border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-all duration-200 group ${highlightedId === conta.id ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900 transition-all duration-500' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: conta.cor + '20' }}
                        >
                          <CreditCard className="w-6 h-6" style={{ color: conta.cor }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{conta.nome}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{conta.tipo} • {conta.transacoesCount} transações</p>
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button 
                          onClick={() => handleEdit(conta)}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(conta.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-400"
                          aria-label="Excluir conta"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Inicial:</span>
                        <span className="text-sm font-medium">{formatCurrency(conta.saldo_inicial || 0)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Saldo em Conta:</span>
                        <span className={`text-xl font-bold ${((conta.saldo_atual || 0) >= 0 ? 'text-green-600' : 'text-red-600')}`}>{formatCurrency(conta.saldo_atual || 0)}</span>
                      </div>

                      {/* Seção de Crédito */}
                      {conta.limite_credito && conta.limite_credito > 0 && (
                        <div className="pt-3 mt-3 border-t border-gray-100 bg-purple-50 dark:bg-purple-900 -mx-6 px-6 pb-3 rounded-b-lg">
                          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">💳 Função Crédito</h4>
                          
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Limite Total:</span>
                            <span className="text-sm font-medium">{formatCurrency(conta.limite_credito || 0)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Fatura Atual:</span>
                            <span className="text-sm font-medium text-red-600">{formatCurrency(conta.gastosCartao || 0)}</span>
                          </div>

                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Limite Restante:</span>
                            <span className={`text-sm font-medium ${(conta.limiteRestante || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(conta.limiteRestante || 0)}</span>
                          </div>

                          {/* Barra de utilização */}
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Utilização do Limite</span>
                              <span className="text-xs text-gray-500">{(conta.utilizacaoPercentual || 0).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  (conta.utilizacaoPercentual || 0) > 80 ? 'bg-red-500' :
                                  (conta.utilizacaoPercentual || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(conta.utilizacaoPercentual || 0, 100)}%` }}
                              />
                            </div>
                            {(conta.utilizacaoPercentual || 0) > 80 && (
                              <div className="flex items-center space-x-1 mt-1">
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-600">Limite quase esgotado</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Valor investido */}
                      {conta.valor_investido && conta.valor_investido > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Valor Investido:</span>
                          <span className="text-sm font-medium text-purple-600">{formatCurrency(conta.valor_investido || 0)}</span>
                        </div>
                      )}
                      
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Receitas:</span>
                          </div>
                          <span className="text-sm font-medium text-green-600">{formatCurrency(conta.receitasTotal || 0)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-1">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Despesas:</span>
                          </div>
                          <span className="text-sm font-medium text-red-600">{formatCurrency(conta.despesasTotal || 0)}</span>
                        </div>
                      </div>
                      
                      {conta.banco && (
                        <div className="pt-2 text-xs text-gray-500 dark:text-gray-400">
                          {conta.banco} {conta.agencia && `• Ag: ${conta.agencia}`} {conta.conta && `• Cc: ${conta.conta}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhuma conta cadastrada</p>
              <p className="text-sm mt-1">Crie sua primeira conta para começar!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        open={!!confirmDeleteId}
        title="Excluir Conta"
        message="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </PageTemplate>
  );
}