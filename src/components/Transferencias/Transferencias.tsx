import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, ArrowRight } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate, validateTransferenciaField, validateTransferenciaForm } from '../../lib/utils';
import { ConfirmModal } from '../Common/ConfirmModal';
import { PageTemplate } from '../Common/PageTemplate';
import type { Conta } from '../../types';

export function Transferencias({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [contas, setContas] = useState<any[]>([]);
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    contaOrigem: '',
    contaDestino: '',
    valor: '',
    descricao: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      
      // Filtrar apenas transferências
      const transferenciasData = lancamentosData.filter(l => l.transferencia_id);
      
      // Agrupar transferências por transferencia_id
      const transferenciasAgrupadas: Record<string, {
        id: string;
        data: string;
        descricao: string;
        valor: number;
        contaOrigem: Conta | null;
        contaDestino: Conta | null;
        created_at: string;
      }> = {};
      lancamentosData.forEach((lancamento: any) => {
        const id = lancamento.transferencia_id;
        if (!transferenciasAgrupadas[id]) {
          transferenciasAgrupadas[id] = {
            id,
            data: lancamento.data,
            descricao: lancamento.descricao,
            valor: 0,
            contaOrigem: null,
            contaDestino: null,
            created_at: lancamento.created_at
          };
        }
        if (lancamento.tipo === 'DESPESA') {
          transferenciasAgrupadas[id].contaOrigem = lancamento.conta ? lancamento.conta : null;
          transferenciasAgrupadas[id].valor = lancamento.valor;
        } else if (lancamento.tipo === 'RECEITA') {
          transferenciasAgrupadas[id].contaDestino = lancamento.conta_destino ? lancamento.conta_destino : (lancamento.conta ? lancamento.conta : null);
        }
      });
      setTransferencias(Object.values(transferenciasAgrupadas));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Handle authentication errors
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: string, value: any) => {
    const error = validateTransferenciaField(field, value, formData, contas);
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = () => {
    const errors = validateTransferenciaForm(formData, contas);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Foco automático no primeiro campo com erro
      const firstErrorKey = Object.keys(formErrors)[0];
      if (firstErrorKey) {
        const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
        if (el) el.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await DatabaseService.createTransferencia(
        formData.contaOrigem,
        formData.contaDestino,
        parseFloat(formData.valor),
        formData.descricao
      );

      await loadData();
      resetForm();
      // Encontrar a transferência mais recente para destacar
      setTimeout(() => {
        if (transferencias.length > 0) {
          setHighlightedId(transferencias[0].id);
          setTimeout(() => setHighlightedId(null), 2000);
        }
      }, 200);
      showToast('Transferência realizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar transferência:', error);
      // Handle authentication errors
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      showToast('Erro ao criar transferência', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contaOrigem: '',
      contaDestino: '',
      valor: '',
      descricao: '',
    });
    setFormErrors({});
    setShowForm(false);
  };

  return (
    <PageTemplate
      title="Transferências"
      subtitle="Transfira valores entre suas contas"
      icon={ArrowLeftRight}
      loading={loading}
      headerActions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Transferência</span>
        </button>
      }
      emptyState={
        transferencias.length === 0 ? {
          icon: ArrowLeftRight,
          title: "Nenhuma transferência encontrada",
          description: "Comece criando sua primeira transferência entre contas.",
          action: (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Transferência
            </button>
          )
        } : undefined
      }
    >

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Nova Transferência</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="contaOrigem" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Conta de Origem *
                </label>
                <select
                  id="contaOrigem"
                  name="contaOrigem"
                  value={formData.contaOrigem}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, contaOrigem: e.target.value }));
                    validateField('contaOrigem', e.target.value);
                  }}
                  onBlur={e => validateField('contaOrigem', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                    formErrors.contaOrigem ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Selecione a conta de origem</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} - {formatCurrency(conta.saldo_atual)}
                    </option>
                  ))}
                </select>
                {formErrors.contaOrigem && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="contaOrigem-error">{formErrors.contaOrigem}</p>
                )}
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>

              <div>
                <label htmlFor="contaDestino" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Conta de Destino *
                </label>
                <select
                  id="contaDestino"
                  name="contaDestino"
                  value={formData.contaDestino}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, contaDestino: e.target.value }));
                    validateField('contaDestino', e.target.value);
                  }}
                  onBlur={e => validateField('contaDestino', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                    formErrors.contaDestino ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Selecione a conta de destino</option>
                  {contas.filter(conta => conta.id !== formData.contaOrigem).map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} - {formatCurrency(conta.saldo_atual)}
                    </option>
                  ))}
                </select>
                {formErrors.contaDestino && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="contaDestino-error">{formErrors.contaDestino}</p>
                )}
              </div>

              <div>
                <label htmlFor="valor" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Valor *
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="valor"
                  name="valor"
                  value={formData.valor}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, valor: e.target.value }));
                    validateField('valor', e.target.value);
                  }}
                  onBlur={e => validateField('valor', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                    formErrors.valor ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0,00"
                />
                {formErrors.valor && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="valor-error">{formErrors.valor}</p>
                )}
              </div>

              <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, descricao: e.target.value }));
                    validateField('descricao', e.target.value);
                  }}
                  onBlur={e => validateField('descricao', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                    formErrors.descricao ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Ex: Transferência para poupança"
                />
                {formErrors.descricao && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1" id="descricao-error">{formErrors.descricao}</p>
                )}
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
                    'Transferir'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Transferências */}
      <div className="space-y-4">
        {transferencias.map((transferencia) => (
          <div
            key={transferencia.id}
            className={`flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 ${highlightedId === transferencia.id ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900 transition-all duration-500' : ''}`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{transferencia.descricao}</p>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{transferencia.contaOrigem?.nome || '-'}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{transferencia.contaDestino?.nome || '-'}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(transferencia.data)}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(transferencia.valor)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </PageTemplate>
  );
}