'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ToastContainer } from './ToastContainer';
import type { Toast, ToastContextValue, ToastOptions } from './types';

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * ToastProvider
 *
 * Modal과의 차이점:
 * - Promise 반환 없음 (단순히 ID만 반환)
 * - resolve/reject 없음 (사용자 입력 대기 불필요)
 * - 제네릭 타입 없음 (문자열 메시지만 처리)
 * - 단순한 배열 추가/제거만 수행
 * - 전역 Portal을 Provider 내부에서 직접 렌더링
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal과 달리 Promise를 반환하지 않고 ID만 반환
  const addToast = useCallback((message: string, options?: ToastOptions): string => {
    const id = crypto.randomUUID();
    const newToast: Toast = {
      id,
      message,
      type: options?.type || 'info',
      duration: options?.duration ?? 6000,
      position: options?.position || 'bottom-right',
      dismissible: options?.dismissible ?? true,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      // 최대 3개까지만 표시
      const newToasts = [...prev, newToast];
      return newToasts.slice(-3);
    });

    return id; // 단순히 ID만 반환
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearAll,
    }),
    [toasts, addToast, removeToast, clearAll]
  );

  // Toast Portal 렌더링
  const renderToastPortal = () => {
    if (typeof document === 'undefined') {
      return null;
    }

    const toastRoot = document.getElementById('toast-root');
    if (!toastRoot) {
      return null;
    }

    return createPortal(<ToastContainer toasts={toasts} />, toastRoot);
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {renderToastPortal()}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}
