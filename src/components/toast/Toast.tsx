'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastContext } from './ToastProvider';
import type { Toast as ToastType, ToastType as ToastTypeEnum } from './types';

interface ToastProps {
  toast: ToastType;
}

/**
 * Toast 컴포넌트
 *
 * 개별 토스트 UI 렌더링 및 자동 닫힘
 */
export function Toast({ toast }: ToastProps) {
  const { removeToast } = useToastContext();

  // 자동 닫힘 타이머
  useEffect(() => {
    if (toast.duration === Infinity) return;

    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const handleDismiss = () => {
    removeToast(toast.id);
  };

  const { icon, iconWrapClass } = getToastStyles(toast.type);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={clsx(
        'pointer-events-auto',
        'flex w-[calc(100vw-1.5rem)] items-start gap-3 rounded-[16px] border border-[#e7e3d3] bg-white p-4 shadow-[0_18px_44px_rgba(26,26,46,0.14)] sm:w-auto sm:min-w-[320px] sm:max-w-[480px]',
        'animate-slide-in',
      )}
    >
      {/* Icon */}
      <div className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px]', iconWrapClass)}>
        {icon}
      </div>

      {/* Message */}
      <div className="min-w-0 flex-1 break-words pt-1 text-sm font-bold leading-6 text-[#1a1a2e]">
        {toast.message}
      </div>

      {/* Dismiss Button */}
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="알림 닫기"
          className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-[#1a1a2e]/35 transition-colors hover:bg-[#f5f3e8] hover:text-[#1a1a2e]"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function getToastStyles(type: ToastTypeEnum) {
  const styles = {
    success: {
      icon: <CheckCircle size={20} />,
      iconWrapClass: 'bg-[#eafaea] text-[#297c3b]',
    },
    error: {
      icon: <XCircle size={20} />,
      iconWrapClass: 'bg-[#fff0f0] text-[#ca2a30]',
    },
    warning: {
      icon: <AlertTriangle size={20} />,
      iconWrapClass: 'bg-[#fff4d5] text-[#a35200]',
    },
    info: {
      icon: <Info size={20} />,
      iconWrapClass: 'bg-[#eaf3fc] text-[#4a88b9]',
    },
  };

  return styles[type];
}
