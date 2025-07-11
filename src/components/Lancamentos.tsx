import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit3, Trash2, Calendar, DollarSign, Search, Filter, X, CheckCircle, Clock, XCircle, CreditCard, ChevronDown, ChevronRight, Edit, Trash } from 'lucide-react';
import { DatabaseService } from '../lib/database';
import { AuthService, AuthUser } from '../lib/auth';
import { formatCurrency, formatDate, createParcelaLancamentos, parseCurrencyInput, validateLancamentoField, validateLancamentoForm, LancamentoFormData } from '../lib/utils';
import { CurrencyInput } from './Common/CurrencyInput';
import { LancamentoItem } from './LancamentoItem';
import { LancamentoFilters } from './LancamentoFilters';
import { Tooltip } from './Common/Tooltip';
import { clsx } from 'clsx';
import { ConfirmModal } from './Common/ConfirmModal';

export function Lancamentos({ showToast, user }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void, user: AuthUser }) {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLancamento, setEditingLancamento] = useState<string | null>(null);
  const [expandedParcelas, setExpandedParcelas] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    tipo: 'TODOS' as 'TODOS' | 'RECEITA' | 'DESPESA',
    categoriaId: '',
    contaId: '',
    status: 'TODOS' as 'TODOS' | 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO',
    dataInicio: '',
    dataFim: '',
  });
  const [formData, setFormData] = useState({
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    tipo: 'DESPESA' as 'RECEITA' | 'DESPESA',
    conta_id: '',
    categoria_id: '',
    observacoes: '',
    status: 'CONFIRMADO' as 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO',
    antecedencia_notificacao: 3,
    cartao_credito_usado: '',
    isParcelado: false,
    numeroParcelas: 2,
    forma_pagamento: 'DEBITO' as 'DEBITO' | 'CREDITO' | 'PIX',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstErrorRef = useRef<HTMLInputElement | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Antes de lancamentosFiltrados:
  const lancamentosAgrupados = useMemo(() => {
    const grupos: any[] = [];
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
          observacoes: primeiraParcela.observacoes,
          status: primeiraParcela.status,
          antecedencia_notificacao: primeiraParcela.antecedencia_notificacao,
          cartao_credito_usado: primeiraParcela.cartao_credito_usado,
          forma_pagamento: primeiraParcela.forma_pagamento, // garantir que o grupo tenha o campo correto
          total_parcelas: primeiraParcela.total_parcelas,
          isParcelado: true, // garantir que o grupo tenha isParcelado
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
  }, [lancamentos]);
  const lancamentosFiltrados = useMemo(() => {
    let resultado = lancamentosAgrupados;

    if (searchTerm) {
      resultado = resultado.filter(l => 
        l.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
  }, [lancamentosAgrupados, searchTerm, filters]);
  // Após lancamentosFiltrados:
  const categoriasFiltered = categorias.filter(c => c.tipo === formData.tipo);
  const hasActiveFilters = filters.tipo !== 'TODOS' || filters.status !== 'TODOS' || filters.categoriaId || filters.contaId || filters.dataInicio || filters.dataFim || searchTerm;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(lancamentosFiltrados.length / itemsPerPage);
  const paginatedLancamentos = lancamentosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lancamentosData, categoriasData, contasData] = await Promise.all([
        DatabaseService.getLancamentos(),
        DatabaseService.getCategorias(),
        DatabaseService.getContas()
      ]);
      setLancamentos(lancamentosData);
      setCategorias(categoriasData);
      setContas(contasData);
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

  const handleFieldChange = (field: keyof LancamentoFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Validação instantânea do campo
    const error = validateLancamentoField(field, value, { ...formData, [field]: value }, temCartaoCredito);
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação centralizada
    const { isValid, errors } = validateLancamentoForm(formData, temCartaoCredito);
    setFormErrors(errors);
    if (!isValid) {
      showToast('Por favor, corrija os erros do formulário.', 'error');
      return;
    }

    // Validação adicional: verificar se a conta tem limite de crédito para compra parcelada
    if (formData.isParcelado && !temCartaoCredito) {
      setFormErrors(prev => ({ ...prev, isParcelado: 'Compra parcelada só é permitida para contas com limite de crédito' }));
      showToast('Compra parcelada só é permitida para contas com limite de crédito', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const valor = formData.valor;
      const dadosBase = {
        ...formData,
        user_id: user.id,
        observacoes: formData.observacoes || null,
        cartao_credito_usado: formData.cartao_credito_usado || null,
        forma_pagamento: formData.tipo === 'DESPESA' ? (formData.forma_pagamento || 'DEBITO') : null,
      };
      let id: string | null = null;
      if (editingLancamento) {
        await DatabaseService.updateLancamento(editingLancamento, dadosBase);
        showToast('Lançamento atualizado com sucesso!', 'info');
        id = editingLancamento;
      } else {
        if (formData.isParcelado && formData.numeroParcelas > 1) {
          const parcelas = createParcelaLancamentos(dadosBase as any, formData.numeroParcelas);
          for (const parcela of parcelas) {
            // Remover campos não aceitos pelo banco
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, parcelas: _parcelas, isParcelado: _isParcelado, numeroParcelas: _numeroParcelas, ...parcelaDb } = parcela;
            // Garantir user_id e tipo válido
            let tipoFinal: 'RECEITA' | 'DESPESA' = (parcela.hasOwnProperty('tipo_transacao') && (parcela as any).tipo_transacao) ? (parcela as any).tipo_transacao : parcela.tipo;
            const parcelaDbFinal = { ...parcelaDb, user_id: user.id, tipo: tipoFinal };
            const novo = await DatabaseService.createLancamento(parcelaDbFinal);
            if (!id) id = novo.id;
          }
          showToast('Lançamento parcelado criado com sucesso!', 'success');
        } else {
          const { id: _id, parcelas: _parcelas, isParcelado: _isParcelado, numeroParcelas: _numeroParcelas, ...dadosBaseDb } = dadosBase as any;
          let tipoFinal: 'RECEITA' | 'DESPESA' = (dadosBase.hasOwnProperty('tipo_transacao') && (dadosBase as any).tipo_transacao) ? (dadosBase as any).tipo_transacao : dadosBase.tipo;
          const dadosBaseFinal = { ...dadosBaseDb, user_id: user.id, tipo: tipoFinal };
          const novo = await DatabaseService.createLancamento(dadosBaseFinal);
          id = novo.id;
          showToast('Lançamento criado com sucesso!', 'success');
        }
      }
      setShowForm(false);
      setEditingLancamento(null);
      setHighlightedId(id);
      loadData();
      resetForm();
    } catch (error) {
      showToast('Erro ao salvar lançamento', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (lancamento: any) => {
    setEditingLancamento(lancamento);
    setFormData({
      descricao: lancamento.descricao || '',
      valor: lancamento.valor,
      data: lancamento.data,
      tipo: lancamento.tipo,
      conta_id: lancamento.conta_id,
      categoria_id: lancamento.categoria_id,
      observacoes: lancamento.observacoes || '',
      status: lancamento.status,
      antecedencia_notificacao: lancamento.antecedencia_notificacao ?? 3,
      cartao_credito_usado: lancamento.cartao_credito_usado || '',
      isParcelado: Boolean(lancamento.isParcelado),
      numeroParcelas: lancamento.numeroParcelas || 2,
      forma_pagamento: lancamento.forma_pagamento || 'DEBITO',
    });
    setShowForm(true);
  };

  const handleStatusChange = async (id: string, novoStatus: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO') => {
    try {
      console.log('Atualizando status:', { id, status: novoStatus });
      await DatabaseService.updateLancamento(id, { status: novoStatus });
      await loadData();
      if (novoStatus === 'PENDENTE') {
        showToast('Lançamento marcado como pendente.', 'info');
      } else if (novoStatus === 'CONFIRMADO') {
        showToast('Lançamento confirmado.', 'success');
      } else if (novoStatus === 'CANCELADO') {
        showToast('Lançamento cancelado.', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // Verifica se é um grupo de parcelas
      const grupo = lancamentosAgrupados.find(l => l.id === id && l.tipo === 'grupo_parcelas');
      if (grupo && grupo.parcelas && grupo.parcelas.length > 0) {
        // Exclui todas as parcelas do grupo
        for (const parcela of grupo.parcelas) {
          await DatabaseService.deleteLancamento(parcela.id);
        }
      } else {
        // Exclui lançamento individual normalmente
      await DatabaseService.deleteLancamento(id);
      }
      await loadData();
      showToast('Lançamento excluído com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      showToast('Erro ao excluir lançamento', 'error');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      tipo: 'DESPESA',
      conta_id: '',
      categoria_id: '',
      observacoes: '',
      status: 'CONFIRMADO',
      antecedencia_notificacao: 3,
      cartao_credito_usado: '',
      isParcelado: false,
      numeroParcelas: 2,
      forma_pagamento: 'DEBITO',
    });
    setFormErrors({});
    setShowForm(false);
    setEditingLancamento(null);
  };

  const clearFilters = () => {
    setFilters({
      tipo: 'TODOS',
      categoriaId: '',
      contaId: '',
      status: 'TODOS',
      dataInicio: '',
      dataFim: '',
    });
    setSearchTerm('');
  };

  const toggleParcelaExpansion = (parcelaId: string) => {
    setExpandedParcelas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parcelaId)) {
        newSet.delete(parcelaId);
      } else {
        newSet.add(parcelaId);
      }
      return newSet;
    });
  };

  // Verificar se a conta selecionada tem cartão de crédito
  const contaSelecionada = contas.find(c => c.id === formData.conta_id);
  const temCartaoCredito = contaSelecionada?.limite_credito && contaSelecionada.limite_credito > 0;

  // Adicionar funções utilitárias locais:
  function getStatusIcon(status: string) {
    switch (status) {
      case 'CONFIRMADO':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDENTE':
        return <Clock className="w-4 h-4" />;
      case 'CANCELADO':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  }
  function getStatusColor(status: string) {
    switch (status) {
      case 'CONFIRMADO':
        return 'text-green-600 bg-green-50';
      case 'PENDENTE':
        return 'text-yellow-600 bg-yellow-50';
      case 'CANCELADO':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">Lançamentos</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl shadow-sm transition-all duration-200 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-200 group"
            aria-label="Adicionar novo lançamento"
            type="button"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Busca e Filtros */}
      <LancamentoFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        filters={filters}
        setFilters={setFilters}
        categorias={categorias}
        contas={contas}
      />

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowForm(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto border border-gray-100 dark:border-gray-700 animate-in transition-all duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <button
                onClick={resetForm}
                className="ml-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="Fechar modal"
                type="button"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Bloco: Descrição */}
              <Tooltip text="Descrição do lançamento (ex: Supermercado, Salário...)" position="right">
                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={e => handleFieldChange('descricao', e.target.value)}
                    onBlur={e => handleFieldChange('descricao', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200 ${formErrors.descricao ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Ex: Supermercado, Salário..."
                    required
                    aria-required={true}
                    autoFocus
                  />
                  {formErrors.descricao && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake" id="descricao-error">{formErrors.descricao}</p>
                  )}
                </div>
              </Tooltip>
              {/* Bloco: Valor e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Tooltip text="Valor do lançamento (apenas números positivos)" position="top">
                  <div>
                    <label htmlFor="valor" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Valor *
                    </label>
                    <CurrencyInput
                      id="valor"
                      name="valor"
                      value={formData.valor}
                      onChange={value => handleFieldChange('valor', value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200 ${formErrors.valor ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                      error={Boolean(formErrors.valor)}
                      required
                      aria-required={true}
                    />
                    {formErrors.valor && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake" id="valor-error">{formErrors.valor}</p>
                    )}
                  </div>
                </Tooltip>
                <Tooltip text="Data do lançamento" position="top">
                  <div>
                    <label htmlFor="data" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Data *
                    </label>
                    <input
                      type="date"
                      id="data"
                      name="data"
                      value={formData.data}
                      onChange={(e) => handleFieldChange('data', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                      required
                      aria-required={true}
                    />
                  </div>
                </Tooltip>
              </div>
              {/* Bloco: Tipo e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Tooltip text="Tipo de lançamento: Receita ou Despesa" position="top">
                  <div>
                    <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Tipo *
                    </label>
                    <select
                      id="tipo"
                      name="tipo"
                      value={formData.tipo}
                      onChange={(e) => handleFieldChange('tipo', e.target.value as 'RECEITA' | 'DESPESA')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                      required
                      aria-required={true}
                    >
                      <option value="DESPESA">Despesa</option>
                      <option value="RECEITA">Receita</option>
                    </select>
                  </div>
                </Tooltip>
                <Tooltip text="Status do lançamento" position="top">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Status *
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value as any)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                      required
                      aria-required={true}
                    >
                      <option value="CONFIRMADO">Confirmado</option>
                      <option value="PENDENTE">Pendente</option>
                    </select>
                  </div>
                </Tooltip>
              </div>
              {/* Bloco: Categoria, Conta, Notificação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Tooltip text="Categoria do lançamento" position="top">
                  <div>
                    <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Categoria *
                    </label>
                    <select
                      id="categoria"
                      name="categoria_id"
                      value={formData.categoria_id}
                      onChange={(e) => handleFieldChange('categoria_id', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200 ${formErrors.categoria_id ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                      required
                      aria-required={true}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categoriasFiltered.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome || 'Categoria'}
                        </option>
                      ))}
                    </select>
                    {formErrors.categoria_id && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake" id="categoria-error">{formErrors.categoria_id}</p>
                    )}
                  </div>
                </Tooltip>
                <Tooltip text="Conta do lançamento" position="top">
                  <div>
                    <label htmlFor="conta" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Conta *
                    </label>
                    <select
                      id="conta"
                      name="conta_id"
                      value={formData.conta_id}
                      onChange={e => {
                        handleFieldChange('conta_id', e.target.value);
                        handleFieldChange('forma_pagamento', 'DEBITO'); // Reset para débito ao trocar conta
                        handleFieldChange('cartao_credito_usado', '');
                      }}
                      onBlur={e => handleFieldChange('conta_id', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200 ${formErrors.conta_id ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                      required
                      aria-required={true}
                    >
                      <option value="">Selecione uma conta</option>
                      {contas.map(conta => (
                        <option key={conta.id} value={conta.id}>
                          {conta.nome || 'Conta'}
                        </option>
                      ))}
                    </select>
                    {formErrors.conta_id && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1 animate-shake" id="conta-error">{formErrors.conta_id}</p>
                    )}
                  </div>
                </Tooltip>
                <Tooltip text="Quando avisar sobre este lançamento?" position="top">
                  <div className="flex flex-col justify-end h-full">
                    <label htmlFor="notificacao" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Notificações
                    </label>
                    <select
                      id="notificacao"
                      name="notificacao"
                      value={formData.antecedencia_notificacao}
                      onChange={(e) => handleFieldChange('antecedencia_notificacao', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                    >
                      <option value="">Sem notificação</option>
                      <option value={1}>1 dia antes</option>
                      <option value={3}>3 dias antes</option>
                      <option value={7}>7 dias antes</option>
                    </select>
                  </div>
                </Tooltip>
              </div>
              {/* Bloco: Observações e Opções */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Observações
                  </label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={e => handleFieldChange('observacoes', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-[64px] transition-all duration-200"
                    placeholder="Observações opcionais..."
                  />
                </div>
                <div className="flex items-center h-full mt-4 md:mt-0 gap-4">
                  {/* Bloco: Forma de Pagamento e Parcelamento */}
                  {formData.tipo === 'DESPESA' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                      <div>
                        <label htmlFor="forma_pagamento" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          Forma de Pagamento *
                        </label>
                        <select
                          id="forma_pagamento"
                          name="forma_pagamento"
                          value={formData.forma_pagamento}
                          onChange={e => handleFieldChange('forma_pagamento', e.target.value as 'DEBITO' | 'CREDITO' | 'PIX')}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                          required
                          aria-required={true}
                        >
                          <option value="DEBITO">Débito</option>
                          <option value="CREDITO">Crédito</option>
                          <option value="PIX">PIX</option>
                        </select>
                      </div>
                      <div className="flex flex-col w-full">
                        <div className="flex items-center">
                  <input
                    id="isParcelado"
                    name="isParcelado"
                    type="checkbox"
                    checked={!!formData.isParcelado}
                            onChange={e => handleFieldChange('isParcelado', !!e.target.checked)}
                    className="mr-2 accent-blue-600 w-5 h-5"
                            disabled={formData.forma_pagamento !== 'CREDITO'}
                  />
                          <label htmlFor="isParcelado" className={"text-sm font-medium select-none cursor-pointer mr-4 " + (formData.forma_pagamento !== 'CREDITO' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200') }>
                    Compra parcelada
                  </label>
                        </div>
                        {formData.isParcelado && formData.forma_pagamento === 'CREDITO' && (
                          <div className="flex flex-col w-full max-w-xs mt-2">
                      <label htmlFor="numeroParcelas" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Qtd. parcelas</label>
                      <input
                        type="number"
                        id="numeroParcelas"
                        name="numeroParcelas"
                        min={2}
                        max={24}
                        value={formData.numeroParcelas}
                        onChange={e => handleFieldChange('numeroParcelas', Number(e.target.value))}
                        className={`w-full px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm ${formErrors.numeroParcelas ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                        required
                        aria-required={true}
                      />
                      {formErrors.numeroParcelas && (
                        <p className="text-red-600 dark:text-red-400 text-xs mt-1 animate-shake" id="numeroParcelas-error">{formErrors.numeroParcelas}</p>
                      )}
                      {formData.valor > 0 && formData.numeroParcelas > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{`Valor por parcela: R$ ${(Number(formData.valor) / Number(formData.numeroParcelas)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
                      )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Bloco: Ações */}
              <div className="flex justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Lançamentos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Histórico de Lançamentos
            </h2>
            <span className="text-sm text-gray-500">
              {lancamentosFiltrados.length} de {lancamentosAgrupados.length} lançamentos
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {paginatedLancamentos.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12 flex flex-col items-center justify-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {paginatedLancamentos.map((lancamento) => (
                lancamento.tipo === 'grupo_parcelas' ? (
                  <div key={lancamento.id} className="flex flex-col">
                <div
                  className={clsx(
                        'group flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
                    highlightedId === lancamento.id && 'ring-2 ring-blue-400/40'
                  )}
                      onClick={() => toggleParcelaExpansion(lancamento.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                          <button
                            type="button"
                            aria-label={expandedParcelas.has(lancamento.id) ? 'Recolher parcelas' : 'Expandir parcelas'}
                            className="mr-2 focus:outline-none"
                            onClick={e => { e.stopPropagation(); toggleParcelaExpansion(lancamento.id); }}
                          >
                            <span className={clsx('transition-transform', expandedParcelas.has(lancamento.id) ? 'rotate-90' : '')}>
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                        </span>
                          </button>
                          <span className="font-semibold text-gray-900 dark:text-white truncate">{lancamento.descricao || 'Compra parcelada'}</span>
                          {/* Status + Badge */}
                          {['CONFIRMADO', 'PENDENTE', 'CANCELADO'].includes(lancamento.status) && (
                            <>
                              <span className={clsx(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-2',
                                lancamento.status === 'CONFIRMADO' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                lancamento.status === 'PENDENTE' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300')
                              }>
                                {lancamento.status === 'CONFIRMADO' && <CheckCircle className="w-4 h-4" />}
                                {lancamento.status === 'PENDENTE' && <Clock className="w-4 h-4" />}
                                {lancamento.status === 'CANCELADO' && <XCircle className="w-4 h-4" />}
                                {lancamento.status}
                        </span>
                              <span className={clsx(
                                'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold',
                                lancamento.forma_pagamento === 'CREDITO'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : lancamento.forma_pagamento === 'PIX'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                              )}>
                                {lancamento.forma_pagamento === 'CREDITO' ? 'CRÉDITO' : lancamento.forma_pagamento === 'PIX' ? 'PIX' : 'DÉBITO'}
                        </span>
                            </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-1 inline" />
                      {formatDate(lancamento.data)}
                      <span className="mx-1">•</span>
                      {lancamento.categoria?.nome || 'Sem categoria'}
                      <span className="mx-1">•</span>
                      {lancamento.conta?.nome || 'Sem conta'}
                          {lancamento.isParcelado && lancamento.total_parcelas > 1 && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-xs text-blue-600 dark:text-blue-300">Parcelado em {lancamento.total_parcelas} vezes</span>
                            </>
                          )}
                          {lancamento.cartao_credito_usado && (
                            <><span className="mx-1">•</span><span>Cartão: {lancamento.cartao_credito_usado}</span></> )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={clsx(
                      'font-bold text-lg whitespace-nowrap',
                      lancamento.tipo_transacao === 'DESPESA' ? 'text-red-600' : 'text-green-600'
                    )}>
                      {lancamento.tipo_transacao === 'DESPESA' ? '- ' : '+ '}{formatCurrency(lancamento.valor)}
                    </span>
                        {/* Controles do grupo parcelado */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip text={lancamento.status === 'CONFIRMADO' ? 'Marcar como Pendente' : 'Marcar como Confirmado'} position="top">
                            <button
                              onClick={async () => {
                                await handleStatusChange(lancamento.id, lancamento.status === 'CONFIRMADO' ? 'PENDENTE' : 'CONFIRMADO');
                              }}
                              className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200"
                              aria-label="Alterar status"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip text="Cancelar compra parcelada" position="top">
                            <button
                              onClick={async () => {
                                await handleStatusChange(lancamento.id, 'CANCELADO');
                              }}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              aria-label="Cancelar compra parcelada"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip text="Editar compra parcelada" position="top">
                            <button
                              onClick={() => handleEdit(lancamento)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              aria-label="Editar compra parcelada"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip text="Excluir compra parcelada" position="top">
                            <button
                              onClick={() => setConfirmDeleteId(lancamento.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              aria-label="Excluir compra parcelada"
                              disabled={deletingId === lancamento.id}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                    {expandedParcelas.has(lancamento.id) && (
                      <div className="ml-8 mt-2 flex flex-col gap-1">
                        {lancamento.parcelas?.map((parcela: any) => (
                          <div key={parcela.id} className="group flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 px-4 py-2 transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{parcela.parcela_atual}/{parcela.total_parcelas}</span>
                              <span className="font-medium text-gray-900 dark:text-white">{formatDate(parcela.data)}</span>
                              {/* Removido o texto do título da parcela */}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={clsx('font-bold text-sm', parcela.status === 'CONFIRMADO' ? 'text-green-600' : parcela.status === 'PENDENTE' ? 'text-yellow-600' : 'text-red-600')}>
                                {formatCurrency(parcela.valor)}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-2"
                                style={{ background: parcela.status === 'CONFIRMADO' ? '#dcfce7' : parcela.status === 'PENDENTE' ? '#fef9c3' : '#fee2e2', color: parcela.status === 'CONFIRMADO' ? '#15803d' : parcela.status === 'PENDENTE' ? '#b45309' : '#b91c1c' }}>
                                {getStatusIcon(parcela.status)} {parcela.status}
                              </span>
                              {/* Controles de item para parcela, só aparecem no hover */}
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip text={parcela.status === 'CONFIRMADO' ? 'Marcar como Pendente' : 'Marcar como Confirmado'} position="top">
                                  <button
                                    onClick={async () => {
                                      await handleStatusChange(parcela.id, parcela.status === 'CONFIRMADO' ? 'PENDENTE' : 'CONFIRMADO');
                                    }}
                                    className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200"
                                    aria-label="Alterar status"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                                <Tooltip text="Cancelar parcela" position="top">
                                  <button
                                    onClick={async () => {
                                      await handleStatusChange(parcela.id, 'CANCELADO');
                                    }}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    aria-label="Cancelar parcela"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                                <Tooltip text="Editar parcela" position="top">
                                  <button
                                    onClick={() => handleEdit(parcela)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                    aria-label="Editar parcela"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                                <Tooltip text="Excluir parcela" position="top">
                                  <button
                                    onClick={() => setConfirmDeleteId(parcela.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    aria-label="Excluir parcela"
                                    disabled={deletingId === parcela.id}
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    key={lancamento.id}
                    className={clsx(
                      'group flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-3 py-2 md:px-4 md:py-3 transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700',
                      highlightedId === lancamento.id && 'ring-2 ring-blue-400/40'
                    )}
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900 dark:text-white truncate text-base md:text-lg">{lancamento.descricao || 'Sem descrição'}</span>
                        {/* Status + Badge */}
                        {['CONFIRMADO', 'PENDENTE', 'CANCELADO'].includes(lancamento.status) && (
                          <>
                            <span className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              lancamento.status === 'CONFIRMADO' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              lancamento.status === 'PENDENTE' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                              'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300')
                            }>
                              {lancamento.status === 'CONFIRMADO' && <CheckCircle className="w-4 h-4" />}
                              {lancamento.status === 'PENDENTE' && <Clock className="w-4 h-4" />}
                              {lancamento.status === 'CANCELADO' && <XCircle className="w-4 h-4" />}
                              {lancamento.status}
                            </span>
                            <span className={clsx(
                              'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold',
                              lancamento.forma_pagamento === 'CREDITO'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : lancamento.forma_pagamento === 'PIX'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                            )}>
                              {lancamento.forma_pagamento === 'CREDITO' ? 'CRÉDITO' : lancamento.forma_pagamento === 'PIX' ? 'PIX' : 'DÉBITO'}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-1 inline" />
                        {formatDate(lancamento.data)}
                        <span className="mx-1">•</span>
                        {lancamento.categoria?.nome || 'Sem categoria'}
                        <span className="mx-1">•</span>
                        {lancamento.conta?.nome || 'Sem conta'}
                        {lancamento.isParcelado && lancamento.total_parcelas > 1 && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="text-xs text-blue-600 dark:text-blue-300">Parcelado em {lancamento.total_parcelas} vezes</span>
                          </>
                        )}
                        {lancamento.cartao_credito_usado && (
                          <><span className="mx-1">•</span><span>Cartão: {lancamento.cartao_credito_usado}</span></> )}
                      </div>
                    </div>
                    <div className="flex flex-row justify-between items-center mt-2 md:mt-0 gap-2 md:gap-4">
                      <span className={clsx(
                        'font-bold text-lg whitespace-nowrap',
                        lancamento.tipo_transacao === 'DESPESA' ? 'text-red-600' : 'text-green-600'
                      )}>
                        {lancamento.tipo_transacao === 'DESPESA' ? '- ' : '+ '}{formatCurrency(lancamento.valor)}
                      </span>
                      {/* Controles */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip text={lancamento.status === 'CONFIRMADO' ? 'Marcar como Pendente' : 'Marcar como Confirmado'} position="top">
                        <button
                          onClick={async () => {
                            await handleStatusChange(lancamento.id, lancamento.status === 'CONFIRMADO' ? 'PENDENTE' : 'CONFIRMADO');
                          }}
                          className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200"
                          aria-label="Alterar status"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Cancelar lançamento" position="top">
                        <button
                          onClick={async () => {
                            await handleStatusChange(lancamento.id, 'CANCELADO');
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          aria-label="Cancelar lançamento"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Editar lançamento" position="top">
                        <button
                          onClick={() => handleEdit(lancamento)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          aria-label="Editar lançamento"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Excluir lançamento" position="top">
                        <button
                          onClick={() => setConfirmDeleteId(lancamento.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          aria-label="Excluir lançamento"
                          disabled={deletingId === lancamento.id}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >Anterior</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
            >{page}</button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >Próxima</button>
        </div>
      )}
      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        open={!!confirmDeleteId}
        title="Excluir lançamento"
        message="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}