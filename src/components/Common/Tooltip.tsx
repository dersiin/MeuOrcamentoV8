import React, { useState, useRef, useLayoutEffect } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    timeout.current = setTimeout(() => setVisible(true), 200);
  };
  const hide = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setVisible(false);
    setAdjustedPosition(position); // reset
  };

  useLayoutEffect(() => {
    if (visible && tooltipRef.current && wrapperRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      let modalRect = null;
      let parent = wrapperRef.current.parentElement;
      while (parent) {
        if (parent.getAttribute('role') === 'dialog') {
          modalRect = parent.getBoundingClientRect();
          break;
        }
        parent = parent.parentElement;
      }
      if (modalRect) {
        // Reset antes de aplicar novo ajuste
        tooltipRef.current.style.transform = '';
        tooltipRef.current.style.left = '';
        tooltipRef.current.style.top = '';
        // Ajuste horizontal (X)
        if (tooltipRect.left < modalRect.left) {
          tooltipRef.current.style.left = `${modalRect.left - wrapperRef.current.getBoundingClientRect().left + 8}px`;
          tooltipRef.current.style.transform = 'none';
        } else if (tooltipRect.right > modalRect.right) {
          const overflowX = tooltipRect.right - modalRect.right;
          tooltipRef.current.style.transform = `translateX(-${overflowX + 8}px)`;
        } else {
          tooltipRef.current.style.transform = '';
          tooltipRef.current.style.left = '';
        }
        // Ajuste vertical (Y)
        if (tooltipRect.top < modalRect.top) {
          tooltipRef.current.style.top = `${modalRect.top - wrapperRef.current.getBoundingClientRect().top + 8}px`;
        } else if (tooltipRect.bottom > modalRect.bottom) {
          const overflowY = tooltipRect.bottom - modalRect.bottom;
          tooltipRef.current.style.transform += ` translateY(-${overflowY + 8}px)`;
        }
      }
    }
  }, [visible, position]);

  let posClass = '';
  if (adjustedPosition === 'top') posClass = 'bottom-full left-1/2 -translate-x-1/2 mb-0';
  if (adjustedPosition === 'bottom') posClass = 'top-full left-1/2 -translate-x-1/2 mt-0';
  if (adjustedPosition === 'left') posClass = 'right-full top-1/2 -translate-y-1/2 mr-2';
  if (adjustedPosition === 'right') posClass = 'left-full top-1/2 -translate-y-1/2 ml-2';

  return (
    <span ref={wrapperRef} className="relative inline-block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} tabIndex={0}>
      {children}
      {visible && (
        <span
          ref={tooltipRef}
          className={`pointer-events-none absolute z-50 max-w-[360px] min-w-[140px] whitespace-nowrap px-5 py-3 rounded-2xl shadow-xl text-[14px] font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 transition-opacity duration-150 opacity-95 overflow-hidden text-ellipsis ${posClass}`}
          role="tooltip"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 140, maxWidth: 360, boxShadow: '0 6px 24px 0 rgba(0,0,0,0.18)' }}
        >
          {text}
        </span>
      )}
    </span>
  );
}; 