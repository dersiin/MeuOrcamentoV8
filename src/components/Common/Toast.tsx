import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const typeStyles = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-400 text-yellow-900',
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 4500 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${typeStyles[type]} animate-fade-in-out font-semibold text-base`}
      role="alert"
    >
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white text-lg font-bold">×</button>
    </div>
  );
};

// Animations (Tailwind):
// .animate-fade-in { animation: fadeIn 0.3s ease; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } } 
// .animate-fade-in-out { animation: fadeInOut 0.5s cubic-bezier(0.4,0,0.2,1); }
// @keyframes fadeInOut { 0% { opacity: 0; transform: translateY(-10px); } 10%, 90% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-10px); } } 