import React from 'react';
import { DollarSign, Calendar, CreditCard, CheckCircle, Clock, XCircle, Edit3, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { LancamentoParcelas } from './LancamentoParcelas';

interface LancamentoItemProps {
  item: any;
  categorias: any[];
  contas: any[];
  expandedParcelas: Set<string>;
  onToggleParcelaExpansion: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO') => void;
  highlightedId: string | null;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

export const LancamentoItem: React.FC<LancamentoItemProps> = ({
  item,
  categorias,
  contas,
  expandedParcelas,
  onToggleParcelaExpansion,
  onEdit,
  onDelete,
  onStatusChange,
  highlightedId,
  getStatusColor,
  getStatusIcon,
}) => {
  const categoria = categorias.find(c => c.id === item.categoria_id);
  const conta = contas.find(c => c.id === item.conta_id);
  const isExpanded = expandedParcelas.has(item.id);

  return (
    <div
      className={`border border-gray-200 rounded-lg ${highlightedId === item.id ? 'ring-2 ring-green-400 bg-green-50 transition-all duration-500' : ''}`}
    >
      {/* Lançamento principal */}
      <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group">
        <div className="flex items-center space-x-4 flex-1">
          {/* Ícone de expansão para parcelas */}
          {item.tipo === 'grupo_parcelas' && (
            <button
              onClick={() => onToggleParcelaExpansion(item.id)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              aria-label={isExpanded ? 'Recolher parcelas' : 'Expandir parcelas'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}

          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor:
                (item.tipo_transacao || item.tipo) === 'RECEITA'
                  ? '#10B981' + '20'
                  : categoria?.cor + '20',
            }}
          >
            {(item.tipo_transacao || item.tipo) === 'RECEITA' ? (
              <DollarSign className="w-6 h-6 text-green-600" />
            ) : (
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: categoria?.cor }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <p className="font-medium text-gray-900 truncate">{item.descricao}</p>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
                <span>{item.status}</span>
              </span>
              {/* Badge de forma de pagamento */}
              {item.forma_pagamento && (
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${item.forma_pagamento === 'CREDITO' ? 'bg-blue-50 text-blue-700' : item.forma_pagamento === 'DEBITO' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  <span>{item.forma_pagamento}</span>
                </span>
              )}
              {/* Badge de cartão */}
              {item.cartao_credito_usado && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                  <CreditCard className="w-3 h-3" />
                  <span>{item.cartao_credito_usado}</span>
                </span>
              )}
              {/* Badge de parcelamento */}
              {item.tipo === 'grupo_parcelas' && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  Parcelado em {item.total_parcelas}x
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 flex-wrap">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(item.data)}</span>
              <span>•</span>
              <span className="truncate">{categoria?.nome}</span>
              <span>•</span>
              <span className="truncate">{conta?.nome}</span>
              {/* Data da primeira parcela para grupo parcelado */}
              {item.tipo === 'grupo_parcelas' && item.parcelas && item.parcelas.length > 0 && (
                <span className="ml-2 text-xs text-gray-400">Início: {formatDate(item.parcelas[0].data)}</span>
              )}
            </div>
            {item.total_parcelas && item.tipo !== 'grupo_parcelas' && (
              <div className="text-xs text-blue-600 mt-1">
                Parcela {item.parcela_atual}/{item.total_parcelas}
              </div>
            )}
            {item.observacoes && (
              <div className="text-xs text-gray-400 mt-1 truncate">{item.observacoes}</div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Valor total para grupo parcelado */}
          {item.tipo === 'grupo_parcelas' ? (
            <div className="font-bold text-lg text-red-600">
              - {formatCurrency(item.valor)}
            </div>
          ) : (
            <div className={`font-semibold text-lg ${(item.tipo_transacao || item.tipo) === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>
              {(item.tipo_transacao || item.tipo) === 'RECEITA' ? '+ ' : '- '}
              {formatCurrency(item.valor)}
            </div>
          )}

          {item.tipo !== 'grupo_parcelas' && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.status !== 'CONFIRMADO' && (
                <button
                  onClick={() => onStatusChange(item.id, 'CONFIRMADO')}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                  title="Confirmar"
                  aria-label="Confirmar lançamento"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              {item.status !== 'PENDENTE' && (
                <button
                  onClick={() => onStatusChange(item.id, 'PENDENTE')}
                  className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200"
                  title="Marcar como Pendente"
                  aria-label="Marcar como pendente"
                >
                  <Clock className="w-4 h-4" />
                </button>
              )}
              {item.status !== 'CANCELADO' && (
                <button
                  onClick={() => onStatusChange(item.id, 'CANCELADO')}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Cancelar"
                  aria-label="Cancelar lançamento"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Editar"
                aria-label="Editar lançamento"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Excluir"
                aria-label="Excluir lançamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Parcelas expandidas */}
      {item.tipo === 'grupo_parcelas' && isExpanded && item.parcelas && (
        <LancamentoParcelas
          parcelas={item.parcelas}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      )}
    </div>
  );
}; 