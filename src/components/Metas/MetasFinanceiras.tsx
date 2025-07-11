import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Calendar, Edit3, Trash2 } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate, validateMetaField, validateMetaForm, MetaFormData } from '../../lib/utils';
import { PageTemplate } from '../Common/PageTemplate';

interface Meta {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA';
  valor_meta: number;
  valor_atual: number;
  data_inicio: string;
  data_fim: string;
  status: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
  cor: string;
  categoria?: {
    nome: string;
    cor: string;
  };
}

export function MetasFinanceiras() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<MetaFormData>({
    nome: '',
    descricao: '',
    tipo: 'ECONOMIA',
    valor_meta: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    categoria_id: '',
    cor: '#F59E0B',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metasData, categoriasData] = await Promise.all([
        DatabaseService.getMetas(),
        DatabaseService.getCategorias(),
      ]);
      setMetas(metasData);
      setCategorias(categoriasData);
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

  const handleFieldChange = (field: keyof MetaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const error = validateMetaField(field, value, { ...formData, [field]: value });
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateMetaForm(formData);
    setFormErrors(errors);
    if (!isValid) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
        if (el) el.focus();
      }
      return;
    }
    try {
      const metaData = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        valor_meta: parseFloat(formData.valor_meta as string),
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        categoria_id: formData.categoria_id || null,
        cor: formData.cor,
      };
      if (editingMeta) {
        await DatabaseService.updateMeta(editingMeta, metaData);
      } else {
        await DatabaseService.createMeta(metaData);
      }
      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao salvar meta');
    }
  };

  const handleEdit = (meta: Meta) => {
    setEditingMeta(meta.id);
    setFormData({
      nome: meta.nome,
      descricao: meta.descricao || '',
      tipo: meta.tipo,
      valor_meta: meta.valor_meta.toString(),
      data_inicio: meta.data_inicio,
      data_fim: meta.data_fim,
      categoria_id: '', // Você precisará ajustar isso baseado na estrutura
      cor: meta.cor,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        await DatabaseService.deleteMeta(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir meta:', error);
        // Handle authentication errors
        if (error instanceof Error && error.message === 'Usuário não autenticado') {
          await AuthService.signOut();
          return;
        }
        alert('Erro ao excluir meta');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'ECONOMIA',
      valor_meta: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      categoria_id: '',
      cor: '#F59E0B',
    });
    setShowForm(false);
    setEditingMeta(null);
  };

  const getProgressPercentage = (meta: Meta) => {
    if (meta.valor_meta === 0) return 0;
    return Math.min((meta.valor_atual / meta.valor_meta) * 100, 100);
  };

  const getStatusColor = (meta: Meta) => {
    const progress = getProgressPercentage(meta);
    if (meta.status === 'CONCLUIDA') return 'text-green-600';
    if (meta.status === 'CANCELADA') return 'text-red-600';
    if (progress >= 100) return 'text-green-600';
    if (progress >= 75) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getStatusText = (meta: Meta) => {
    const progress = getProgressPercentage(meta);
    if (meta.status === 'CONCLUIDA') return 'Concluída';
    if (meta.status === 'CANCELADA') return 'Cancelada';
    if (meta.status === 'PAUSADA') return 'Pausada';
    if (progress >= 100) return 'Meta atingida!';
    return 'Em andamento';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PageTemplate
      title="Metas Financeiras"
      subtitle="Defina e acompanhe seus objetivos financeiros"
      icon={Target}
      loading={loading}
      headerActions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Meta</span>
        </button>
      }
      emptyState={
        metas.length === 0 ? {
          icon: Target,
          title: "Nenhuma meta encontrada",
          description: "Comece criando suas primeiras metas financeiras para alcançar seus objetivos.",
          action: (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta
            </button>
          )
        } : undefined
      }
    >

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingMeta ? 'Editar Meta' : 'Nova Meta'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nome da Meta *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={e => handleFieldChange('nome', e.target.value)}
                  onBlur={e => handleFieldChange('nome', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.nome ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Ex: Juntar para viagem, Limitar gastos..."
                />
                {formErrors.nome && <span className="text-red-500 text-xs mt-1 block">{formErrors.nome}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tipo de Meta *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={e => handleFieldChange('tipo', e.target.value as 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA')}
                  onBlur={e => handleFieldChange('tipo', e.target.value as 'ECONOMIA' | 'GASTO_MAXIMO' | 'RECEITA_MINIMA')}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.tipo ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="ECONOMIA">Economia</option>
                  <option value="GASTO_MAXIMO">Gasto Máximo</option>
                  <option value="RECEITA_MINIMA">Receita Mínima</option>
                </select>
                {formErrors.tipo && <span className="text-red-500 text-xs mt-1 block">{formErrors.tipo}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Valor da Meta *
                </label>
                <input
                  type="number"
                  name="valor_meta"
                  value={formData.valor_meta}
                  onChange={e => handleFieldChange('valor_meta', e.target.value)}
                  onBlur={e => handleFieldChange('valor_meta', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.valor_meta ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Valor da meta"
                />
                {formErrors.valor_meta && <span className="text-red-500 text-xs mt-1 block">{formErrors.valor_meta}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    name="data_inicio"
                    value={formData.data_inicio}
                    onChange={e => handleFieldChange('data_inicio', e.target.value)}
                    onBlur={e => handleFieldChange('data_inicio', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.data_inicio ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.data_inicio && <span className="text-red-500 text-xs mt-1 block">{formErrors.data_inicio}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    name="data_fim"
                    value={formData.data_fim}
                    onChange={e => handleFieldChange('data_fim', e.target.value)}
                    onBlur={e => handleFieldChange('data_fim', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.data_fim ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.data_fim && <span className="text-red-500 text-xs mt-1 block">{formErrors.data_fim}</span>}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {editingMeta ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resumo Geral */}
      {metas.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metas.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total de Metas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{metas.filter(m => m.status === 'CONCLUIDA').length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Metas Concluídas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metas.filter(m => m.status === 'ATIVA').length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Em Andamento</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(metas.reduce((total, meta) => total + meta.valor_atual, 0))}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Investido</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {metas.map((meta) => {
          const progress = getProgressPercentage(meta);
          const statusColor = getStatusColor(meta);
          const statusText = getStatusText(meta);
          
          return (
            <div key={meta.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: meta.cor + '20' }}
                  >
                    <Target className="w-6 h-6" style={{ color: meta.cor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{meta.nome}</h3>
                    <p className={`text-sm ${statusColor}`}>{statusText}</p>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(meta)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(meta.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {meta.descricao && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{meta.descricao}</p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Progresso:</span>
                  <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: meta.cor
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Atual</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(meta.valor_atual)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Meta</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(meta.valor_meta)}</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(meta.data_inicio)}</span>
                    </div>
                    <span>até</span>
                    <span>{formatDate(meta.data_fim)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {metas.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma meta cadastrada</p>
          <p className="text-sm mt-1">Crie sua primeira meta financeira!</p>
        </div>
      )}
    </PageTemplate>
  );
}