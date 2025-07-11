import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Tag } from 'lucide-react';
import { DatabaseService } from '../lib/database';
import { AuthService } from '../lib/auth';
import { validateCategoriaField, validateCategoriaForm, CategoriaFormData } from '../lib/utils';
import { PageTemplate } from './Common/PageTemplate';

const cores = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B'
];

export function Categorias() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoriaFormData>({
    nome: '',
    tipo: 'DESPESA',
    cor: cores[0],
    descricao: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriasData, lancamentosData] = await Promise.all([
        DatabaseService.getCategorias(),
        DatabaseService.getLancamentos()
      ]);
      setCategorias(categoriasData);
      setLancamentos(lancamentosData);
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

  const handleFieldChange = (field: keyof CategoriaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const error = validateCategoriaField(field, value, { ...formData, [field]: value });
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateCategoriaForm(formData);
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
      const categoriaData = {
        nome: formData.nome,
        tipo: formData.tipo,
        cor: formData.cor,
        descricao: formData.descricao || null,
      };
      if (editingCategoria) {
        await DatabaseService.updateCategoria(editingCategoria, categoriaData);
      } else {
        await DatabaseService.createCategoria(categoriaData);
      }
      await loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
      alert('Erro ao salvar categoria');
    }
  };

  const handleEdit = (categoria: any) => {
    setEditingCategoria(categoria.id);
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo,
      cor: categoria.cor,
      descricao: categoria.descricao || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const hasTransactions = lancamentos.some(l => l.categoria_id === id);
    if (hasTransactions) {
      alert('Não é possível excluir uma categoria que possui lançamentos vinculados.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await DatabaseService.deleteCategoria(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        // Handle authentication errors
        if (error instanceof Error && error.message === 'Usuário não autenticado') {
          await AuthService.signOut();
          return;
        }
        alert('Erro ao excluir categoria');
      }
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', tipo: 'DESPESA', cor: cores[0], descricao: '' });
    setShowForm(false);
    setEditingCategoria(null);
  };

  const getTransactionsCount = (categoriaId: string) => {
    return lancamentos.filter(l => l.categoria_id === categoriaId).length;
  };

  const categoriasReceitas = categorias.filter(c => c.tipo === 'RECEITA');
  const categoriasDespesas = categorias.filter(c => c.tipo === 'DESPESA');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PageTemplate
      title="Categorias"
      subtitle="Organize suas receitas e despesas"
      icon={Tag}
      loading={loading}
      headerActions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Categoria</span>
        </button>
      }
      emptyState={
        categorias.length === 0 ? {
          icon: Tag,
          title: "Nenhuma categoria encontrada",
          description: "Comece criando suas primeiras categorias para organizar suas finanças.",
          action: (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={e => handleFieldChange('nome', e.target.value)}
                  onBlur={e => handleFieldChange('nome', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.nome ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Ex: Alimentação, Transporte..."
                />
                {formErrors.nome && <span className="text-red-500 text-xs mt-1 block">{formErrors.nome}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tipo *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={e => handleFieldChange('tipo', e.target.value as 'RECEITA' | 'DESPESA')}
                  onBlur={e => handleFieldChange('tipo', e.target.value as 'RECEITA' | 'DESPESA')}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${formErrors.tipo ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                </select>
                {formErrors.tipo && <span className="text-red-500 text-xs mt-1 block">{formErrors.tipo}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Cor
                </label>
                <input
                  type="color"
                  name="cor"
                  value={formData.cor}
                  onChange={e => handleFieldChange('cor', e.target.value)}
                  onBlur={e => handleFieldChange('cor', e.target.value)}
                  className={`w-10 h-10 border-2 rounded-lg cursor-pointer ${formErrors.cor ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {formErrors.cor && <span className="text-red-500 text-xs mt-1 block">{formErrors.cor}</span>}
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
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {editingCategoria ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resumo Geral */}
      {categorias.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{categorias.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total de Categorias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{categorias.filter(c => c.tipo === 'RECEITA').length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Categorias de Receita</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{categorias.filter(c => c.tipo === 'DESPESA').length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Categorias de Despesa</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{categorias.filter(c => c.tipo === 'TRANSFERENCIA').length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Categorias de Transferência</div>
            </div>
          </div>
        </div>
      )}

      {/* Categorias de Despesas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Categorias de Despesas</h2>
        </div>
        
        <div className="p-6">
          {categoriasDespesas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriasDespesas.map((categoria) => {
                const transacoesCount = getTransactionsCount(categoria.id);
                
                return (
                  <div key={categoria.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: categoria.cor + '20' }}
                        >
                          <div 
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: categoria.cor }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{categoria.nome}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{transacoesCount} transações</p>
                          {categoria.descricao && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{categoria.descricao}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button 
                          onClick={() => handleEdit(categoria)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(categoria.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma categoria de despesa cadastrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Categorias de Receitas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Categorias de Receitas</h2>
        </div>
        
        <div className="p-6">
          {categoriasReceitas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriasReceitas.map((categoria) => {
                const transacoesCount = getTransactionsCount(categoria.id);
                
                return (
                  <div key={categoria.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: categoria.cor + '20' }}
                        >
                          <div 
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: categoria.cor }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{categoria.nome}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{transacoesCount} transações</p>
                          {categoria.descricao && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{categoria.descricao}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                        <button 
                          onClick={() => handleEdit(categoria)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(categoria.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma categoria de receita cadastrada</p>
            </div>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}