import React from 'react';
import { formatCurrency, formatDate } from '../lib/utils';
import { CheckCircle, Clock, Edit3, Trash2 } from 'lucide-react';

interface LancamentoParcelasProps {
  parcelas: any[];
  onEdit: (parcela: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO') => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

export const LancamentoParcelas: React.FC<LancamentoParcelasProps> = ({
  parcelas,
  onEdit,
  onDelete,
  onStatusChange,
  getStatusColor,
  getStatusIcon,
}) => (
  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
    <div className="p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Parcelas:</h4>
      <div className="space-y-2">
        {parcelas.map((parcela: any) => (
          <div
            key={parcela.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
          >
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600">
                {parcela.parcela_atual}/{parcela.total_parcelas}
              </span>
              <span className="text-sm text-gray-600">{formatDate(parcela.data)}</span>
              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(parcela.status)}`}>
                {getStatusIcon(parcela.status)}
                <span>{parcela.status}</span>
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="font-medium text-red-600">{formatCurrency(parcela.valor)}</span>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {parcela.status !== 'CONFIRMADO' && (
                  <button
                    onClick={() => onStatusChange(parcela.id, 'CONFIRMADO')}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    title="Confirmar"
                    aria-label="Confirmar parcela"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {parcela.status !== 'PENDENTE' && (
                  <button
                    onClick={() => onStatusChange(parcela.id, 'PENDENTE')}
                    className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                    title="Marcar como Pendente"
                    aria-label="Marcar parcela como pendente"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onEdit(parcela)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Editar"
                  aria-label="Editar parcela"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(parcela.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Excluir"
                  aria-label="Excluir parcela"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
); 