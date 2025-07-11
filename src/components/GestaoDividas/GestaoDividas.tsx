import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CreditCard, Calendar, TrendingDown, AlertTriangle, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate, parseCurrencyInput, validateDividaField, validateDividaForm, DividaFormData } from '../../lib/utils';
import { CurrencyInput } from '../Common/CurrencyInput';
import { ConfirmModal } from '../Common/ConfirmModal';
import { PageTemplate } from '../Common/PageTemplate';

interface Divida {
  id: string;
  nome: string;
  tipo: 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO_CREDITO' | 'OUTRO';
  valor_total: number;
  valor_pago: number;
  valor_restante: number;
  taxa_juros: number;
  data_inicio: string;
  data_vencimento: string;
  parcela_valor: number;
  parcelas_total: number;
  parcelas_pagas: number;
  status: 'ATIVA' | 'QUITADA' | 'EM_ATRASO';
  observacoes?: string;
  created_at: string;
}

export function GestaoDividas({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDivida, setEditingDivida] = useState<string | null>(null);
  const [formData, setFormData] = useState<DividaFormData>({
    nome: '',
    tipo: 'EMPRESTIMO',
    valor_total: 0,
    taxa_juros: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    parcelas_total: 1,
    observacoes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    loadDividas();
  }, []);

  const loadDividas = async () => {
    try {
      setLoading(true);
      const dividasData = await DatabaseService.getDividas();
      setDividas(dividasData);
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof DividaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const error = validateDividaField(field, value, { ...formData, [field]: value });
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateDividaForm(formData);
    setFormErrors(errors);
    if (!isValid) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
        if (el) el.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      setLoading(true);
      const valorTotal = typeof formData.valor_total === 'string'
        ? parseCurrencyInput(formData.valor_total)
        : formData.valor_total;
      const parcelasTotal = formData.parcelas_total;
      const parcelaValor = valorTotal / parcelasTotal;
      const dividaData = {
        nome: formData.nome,
        tipo: formData.tipo,
        valor_total: valorTotal,
        valor_pago: 0, // Inicialmente 0
        valor_restante: valorTotal, // Inicialmente igual ao total
        taxa_juros: formData.taxa_juros,
        data_inicio: formData.data_inicio,
        data_vencimento: formData.data_vencimento,
        parcela_valor: parcelaValor,
        parcelas_total: parcelasTotal,
        parcelas_pagas: 0, // Inicialmente 0
        status: 'ATIVA',
        observacoes: formData.observacoes || '',
      };
      let id: string | null = null;
      if (editingDivida) {
        await DatabaseService.updateDivida(editingDivida, dividaData);
        showToast('Dívida atualizada com sucesso!', 'success');
        id = editingDivida;
      } else {
        const nova = await DatabaseService.createDivida(dividaData);
        showToast('Dívida criada com sucesso!', 'success');
        id = nova.id;
      }
      await loadDividas();
      resetForm();
      if (id) {
        setHighlightedId(id);
        setTimeout(() => setHighlightedId(null), 2000);
      }
    } catch (error) {
      console.error('Erro ao salvar dívida:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      showToast('Erro ao salvar dívida', 'error');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleEdit = (divida: Divida) => {
    setEditingDivida(divida.id);
    setFormData({
      nome: divida.nome,
      tipo: divida.tipo,
      valor_total: divida.valor_total,
      taxa_juros: divida.taxa_juros,
      data_inicio: divida.data_inicio,
      data_vencimento: divida.data_vencimento,
      parcelas_total: divida.parcelas_total,
      observacoes: divida.observacoes || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setLoading(true);
      await DatabaseService.deleteDivida(confirmDeleteId);
      await loadDividas();
      showToast('Dívida excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir dívida:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      showToast('Erro ao excluir dívida', 'error');
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'EMPRESTIMO',
      valor_total: 0,
      taxa_juros: 0,
      data_inicio: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      parcelas_total: 1,
      observacoes: '',
    });
    setShowForm(false);
    setEditingDivida(null);
    setFormErrors({}); // Resetar erros ao fechar o formulário
  };

  const validateField = (field: string, value: any) => {
    let error = '';
    switch (field) {
      case 'nome':
        if (!value.trim()) error = 'Nome é obrigatório';
        break;
      case 'tipo':
        if (!value) error = 'Tipo é obrigatório';
        break;
      case 'valor_total':
        if (value <= 0) error = 'Valor total deve ser maior que zero';
        break;
      case 'taxa_juros':
        if (value < 0) error = 'Taxa de juros não pode ser negativa';
        break;
      case 'parcelas_total':
        if (value < 1) error = 'Deve ter pelo menos 1 parcela';
        break;
      case 'data_inicio':
        if (!value) error = 'Data de início é obrigatória';
        break;
      case 'data_vencimento':
        if (!value) error = 'Data de vencimento é obrigatória';
        break;
      default:
        break;
    }
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors: { [key: string]: string } = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
      isValid = false;
    }
    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório';
      isValid = false;
    }
    if (formData.valor_total <= 0) {
      newErrors.valor_total = 'Valor total deve ser maior que zero';
      isValid = false;
    }
    if (formData.taxa_juros < 0) {
      newErrors.taxa_juros = 'Taxa de juros não pode ser negativa';
      isValid = false;
    }
    if (formData.parcelas_total < 1) {
      newErrors.parcelas_total = 'Deve ter pelo menos 1 parcela';
      isValid = false;
    }
    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória';
      isValid = false;
    }
    if (!formData.data_vencimento) {
      newErrors.data_vencimento = 'Data de vencimento é obrigatória';
      isValid = false;
    }

    setFormErrors(newErrors);
    return isValid;
  };

  const resumoGeral = useMemo(() => {
    const totalDividas = dividas.reduce((sum, d) => sum + d.valor_restante, 0);
    const totalPago = dividas.reduce((sum, d) => sum + d.valor_pago, 0);
    const parcelasMensais = dividas.filter(d => d.status === 'ATIVA').reduce((sum, d) => sum + d.parcela_valor, 0);
    const dividasAtivas = dividas.filter(d => d.status === 'ATIVA').length;

    return {
      totalDividas,
      totalPago,
      parcelasMensais,
      dividasAtivas
    };
  }, [dividas]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'QUITADA':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'EM_ATRASO':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'QUITADA':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'EM_ATRASO':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <PageTemplate
      title="Gestão de Dívidas"
      subtitle="Controle empréstimos, financiamentos e outras dívidas"
      icon={TrendingDown}
      loading={loading}
      headerActions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Dívida</span>
        </button>
      }
      emptyState={
        dividas.length === 0 ? {
          icon: TrendingDown,
          title: "Nenhuma dívida encontrada",
          description: "Comece registrando suas dívidas para controlar seus compromissos financeiros.",
          action: (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Dívida
            </button>
          )
        } : undefined
      }
    >

      {/* Resumo Geral */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo das Dívidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(resumoGeral.totalDividas)}</div>
            <div className="text-sm text-gray-600">Total em Dívidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(resumoGeral.totalPago)}</div>
            <div className="text-sm text-gray-600">Total Pago</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(resumoGeral.parcelasMensais)}</div>
            <div className="text-sm text-gray-600">Parcelas Mensais</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{resumoGeral.dividasAtivas}</div>
            <div className="text-sm text-gray-600">Dívidas Ativas</div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDivida ? 'Editar Dívida' : 'Nova Dívida'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Dívida *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={e => handleFieldChange('nome', e.target.value)}
                  onBlur={e => handleFieldChange('nome', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.nome ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Ex: Empréstimo Banco, Cartão de Crédito..."
                />
                {formErrors.nome && <span className="text-red-500 text-xs mt-1 block">{formErrors.nome}</span>}
              </div>

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={e => handleFieldChange('tipo', e.target.value as 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO_CREDITO' | 'OUTRO')}
                  onBlur={e => handleFieldChange('tipo', e.target.value as 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO_CREDITO' | 'OUTRO')}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.tipo ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="EMPRESTIMO">Empréstimo</option>
                  <option value="FINANCIAMENTO">Financiamento</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="OUTRO">Outro</option>
                </select>
                {formErrors.tipo && <span className="text-red-500 text-xs mt-1 block">{formErrors.tipo}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="valor_total" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total *
                  </label>
                  <CurrencyInput
                    name="valor_total"
                    value={formData.valor_total}
                    onChange={value => handleFieldChange('valor_total', value)}
                    onBlur={() => handleFieldChange('valor_total', formData.valor_total)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.valor_total ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    error={Boolean(formErrors.valor_total)}
                    required
                    placeholder="R$ 0,00"
                  />
                  {formErrors.valor_total && <span className="text-red-500 text-xs mt-1 block">{formErrors.valor_total}</span>}
                </div>
                
                <div>
                  <label htmlFor="taxa_juros" className="block text-sm font-medium text-gray-700 mb-1">
                    Taxa de Juros (% a.a.)
                  </label>
                  <input
                    type="number"
                    name="taxa_juros"
                    value={formData.taxa_juros}
                    onChange={e => handleFieldChange('taxa_juros', Number(e.target.value))}
                    onBlur={e => handleFieldChange('taxa_juros', Number(e.target.value))}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.taxa_juros ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    min={0}
                    step={0.01}
                    required
                    placeholder="0%"
                  />
                  {formErrors.taxa_juros && <span className="text-red-500 text-xs mt-1 block">{formErrors.taxa_juros}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    name="data_inicio"
                    value={formData.data_inicio}
                    onChange={e => handleFieldChange('data_inicio', e.target.value)}
                    onBlur={e => handleFieldChange('data_inicio', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.data_inicio ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    required
                  />
                  {formErrors.data_inicio && <span className="text-red-500 text-xs mt-1 block">{formErrors.data_inicio}</span>}
                </div>
                
                <div>
                  <label htmlFor="data_vencimento" className="block text-sm font-medium text-gray-700 mb-1">
                    Data Vencimento *
                  </label>
                  <input
                    type="date"
                    name="data_vencimento"
                    value={formData.data_vencimento}
                    onChange={e => handleFieldChange('data_vencimento', e.target.value)}
                    onBlur={e => handleFieldChange('data_vencimento', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.data_vencimento ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    required
                  />
                  {formErrors.data_vencimento && <span className="text-red-500 text-xs mt-1 block">{formErrors.data_vencimento}</span>}
                </div>
              </div>

              <div>
                <label htmlFor="parcelas_total" className="block text-sm font-medium text-gray-700 mb-1">
                  Total de Parcelas *
                </label>
                <input
                  type="number"
                  name="parcelas_total"
                  value={formData.parcelas_total}
                  onChange={e => handleFieldChange('parcelas_total', Number(e.target.value))}
                  onBlur={e => handleFieldChange('parcelas_total', Number(e.target.value))}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.parcelas_total ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  min={1}
                  required
                  placeholder="1"
                />
                {formErrors.parcelas_total && <span className="text-red-500 text-xs mt-1 block">{formErrors.parcelas_total}</span>}
              </div>

              <div>
                <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Informações adicionais..."
                  rows={3}
                />
                {formErrors.observacoes && <span className="text-red-500 text-xs mt-1 block">{formErrors.observacoes}</span>}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  aria-label="Cancelar"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  disabled={isSubmitting}
                  aria-label="Salvar dívida"
                >
                  {isSubmitting ? (
                    <span className="flex items-center"><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>Salvando...</span>
                  ) : (
                    editingDivida ? 'Salvar' : 'Criar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Dívidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dividas.map((divida) => {
          const progressoPagamento = divida.valor_total > 0 ? (divida.valor_pago / divida.valor_total) * 100 : 0;
          const progressoParcelas = divida.parcelas_total > 0 ? (divida.parcelas_pagas / divida.parcelas_total) * 100 : 0;
          
          return (
            <div
              key={divida.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 group ${getStatusColor(divida.status)} ${highlightedId === divida.id ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900 transition-all duration-500' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{divida.nome}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(divida.status)}
                      <span className="text-sm font-medium">{divida.tipo}</span>
                    </div>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(divida)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="Editar dívida"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(divida.id)}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                    aria-label="Excluir dívida"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Progresso de Pagamento */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progresso de Pagamento:</span>
                    <span className="text-sm font-medium">{progressoPagamento.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${Math.min(progressoPagamento, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Informações Financeiras */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Valor Total</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(divida.valor_total)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Valor Restante</p>
                    <p className="font-semibold text-red-600">{formatCurrency(divida.valor_restante)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Parcela Mensal</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(divida.parcela_valor)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Taxa de Juros</p>
                    <p className="font-semibold text-gray-900">{divida.taxa_juros.toFixed(2)}% a.a.</p>
                  </div>
                </div>

                {/* Progresso de Parcelas */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Parcelas:</span>
                    <span className="text-sm font-medium">{divida.parcelas_pagas}/{divida.parcelas_total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(progressoParcelas, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Datas */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Início: {formatDate(divida.data_inicio)}</span>
                    </div>
                    <span>Fim: {formatDate(divida.data_vencimento)}</span>
                  </div>
                </div>

                {divida.observacoes && (
                  <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    {divida.observacoes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de Dívidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dividas.map((divida) => {
          const progressoPagamento = divida.valor_total > 0 ? (divida.valor_pago / divida.valor_total) * 100 : 0;
          const progressoParcelas = divida.parcelas_total > 0 ? (divida.parcelas_pagas / divida.parcelas_total) * 100 : 0;
          
          return (
            <div
              key={divida.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 group ${getStatusColor(divida.status)} ${highlightedId === divida.id ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900 transition-all duration-500' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{divida.nome}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(divida.status)}
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{divida.tipo}</span>
                    </div>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(divida)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="Editar dívida"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(divida.id)}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                    aria-label="Excluir dívida"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Progresso de Pagamento */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Progresso de Pagamento:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{progressoPagamento.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${Math.min(progressoPagamento, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Informações Financeiras */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Valor Total</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(divida.valor_total)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Valor Restante</p>
                    <p className="font-semibold text-red-600">{formatCurrency(divida.valor_restante)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Parcela Mensal</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(divida.parcela_valor)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Taxa de Juros</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{divida.taxa_juros.toFixed(2)}% a.a.</p>
                  </div>
                </div>

                {/* Progresso de Parcelas */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Parcelas:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{divida.parcelas_pagas}/{divida.parcelas_total}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(progressoParcelas, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Datas */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Início: {formatDate(divida.data_inicio)}</span>
                    </div>
                    <span>Fim: {formatDate(divida.data_vencimento)}</span>
                  </div>
                </div>

                {divida.observacoes && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    {divida.observacoes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        open={!!confirmDeleteId}
        title="Excluir Dívida"
        message="Tem certeza que deseja excluir esta dívida? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </PageTemplate>
  );
}