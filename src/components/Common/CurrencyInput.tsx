import React, { useState, useEffect } from 'react';
import { formatCurrencyInput, parseCurrencyInput } from '../../lib/utils';

interface CurrencyInputProps {
  value: string | number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "R$ 0,00", 
  className = "",
  disabled = false,
  error = false,
  required = false,
  id,
  name
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (typeof value === 'number') {
      setDisplayValue(formatCurrencyInput(value));
    } else if (typeof value === 'string') {
      setDisplayValue(value);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é dígito
    let rawValue = e.target.value.replace(/\D/g, '');
    // Se vazio, mostra vazio
    if (!rawValue) {
      setDisplayValue('');
      onChange(0);
      return;
    }
    // Converte para número (centavos)
    let numberValue = parseInt(rawValue, 10);
    // Divide por 100 para obter reais
    let reais = numberValue / 100;
    // Formata para moeda brasileira
    setDisplayValue(formatCurrencyInput(reais));
    onChange(reais);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      id={id}
      name={name}
      className={`${className || ''} bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${error ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
    />
  );
}