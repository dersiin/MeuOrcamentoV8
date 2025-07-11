import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  loading?: boolean;
  error?: string;
  emptyState?: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  showFilters?: boolean;
  filtersComponent?: React.ReactNode;
  searchComponent?: React.ReactNode;
  paginationComponent?: React.ReactNode;
  className?: string;
}

export function PageTemplate({
  title,
  subtitle,
  icon: Icon,
  children,
  headerActions,
  loading = false,
  error,
  emptyState,
  showFilters = false,
  filtersComponent,
  searchComponent,
  paginationComponent,
  className = ''
}: PageTemplateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {Icon && <Icon className="inline-block w-8 h-8 mr-3 text-blue-600" />}
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-300 mt-2">{subtitle}</p>
            )}
          </div>
          {headerActions}
        </div>

        {/* Error State */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Erro ao carregar dados
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
            {Icon && <Icon className="inline-block w-8 h-8 mr-3 text-blue-600 align-middle" />}
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>
          )}
        </div>
        {headerActions}
      </div>

      {/* Search and Filters */}
      {(searchComponent || showFilters) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              {searchComponent && (
                <div className="flex-1">
                  {searchComponent}
                </div>
              )}
              {showFilters && filtersComponent && (
                <div className="flex-shrink-0">
                  {filtersComponent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {emptyState ? (
          <div className="p-12 text-center">
            <emptyState.icon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {emptyState.title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {emptyState.description}
            </p>
            {emptyState.action}
          </div>
        ) : (
          <div className="p-6">
            {children}
          </div>
        )}
      </div>

      {/* Pagination */}
      {paginationComponent && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            {paginationComponent}
          </div>
        </div>
      )}
    </div>
  );
} 