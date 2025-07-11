import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Tooltip } from './Common/Tooltip';

interface LancamentoFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filters: any;
  setFilters: (fn: (prev: any) => any) => void;
  categorias: any[];
  contas: any[];
}

export const LancamentoFilters: React.FC<LancamentoFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  clearFilters,
  filters,
  setFilters,
  categorias,
  contas,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6 mb-4 animate-in transition-all duration-300">
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
          aria-label="Buscar por descrição"
        />
      </div>
      <Tooltip text="Filtros avançados: tipo, status, categoria, conta, datas" position="top">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 group ${
            hasActiveFilters
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          aria-label="Abrir filtros avançados"
          type="button"
        >
          <Filter className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">!</span>
          )}
        </button>
      </Tooltip>
      {hasActiveFilters && (
        <Tooltip text="Limpar todos os filtros" position="top">
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-white transition-colors rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 font-semibold shadow-sm"
            aria-label="Limpar filtros"
            type="button"
          >
            <X className="w-4 h-4" />
            <span>Limpar</span>
          </button>
        </Tooltip>
      )}
    </div>
    {showFilters && (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Tooltip text="Filtrar por tipo de lançamento" position="top">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, tipo: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                aria-label="Tipo de lançamento"
              >
                <option value="TODOS">Todos</option>
                <option value="RECEITA">Receitas</option>
                <option value="DESPESA">Despesas</option>
              </select>
            </div>
          </Tooltip>
          <Tooltip text="Filtrar por status do lançamento" position="top">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                aria-label="Status do lançamento"
              >
                <option value="TODOS">Todos</option>
                <option value="CONFIRMADO">Confirmado</option>
                <option value="PENDENTE">Pendente</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </Tooltip>
          <Tooltip text="Filtrar por categoria" position="top">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Categoria</label>
              <select
                value={filters.categoriaId}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, categoriaId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                aria-label="Categoria"
              >
                <option value="">Todas</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nome || 'Categoria'}</option>
                ))}
              </select>
            </div>
          </Tooltip>
          <Tooltip text="Filtrar por conta" position="top">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Conta</label>
              <select
                value={filters.contaId}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, contaId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                aria-label="Conta"
              >
                <option value="">Todas</option>
                {contas.map(conta => (
                  <option key={conta.id} value={conta.id}>{conta.nome || 'Conta'}</option>
                ))}
              </select>
            </div>
          </Tooltip>
          <Tooltip text="Filtrar por data de início" position="top">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data Início</label>
              <input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, dataInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                aria-label="Data de início"
              />
            </div>
          </Tooltip>
          <Tooltip text="Filtrar por data de fim" position="top">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data Fim</label>
              <input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, dataFim: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-200"
                aria-label="Data de fim"
              />
            </div>
          </Tooltip>
        </div>
      </div>
    )}
  </div>
); 