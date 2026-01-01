'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Modal, ModalContextValue, ModalOptions, ModalProps } from './types';

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);

  const openModal = useCallback(
    <T = void>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component: React.ComponentType<any>,
      options?: ModalOptions
    ): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        // options에서 id를 가져오거나, 없으면 생성
        const id = options?.id || crypto.randomUUID();

        const newModal: Modal = {
          id,
          component,
          options,
          resolve,
          reject,
        };

        setModals((prev) => [...prev, newModal]);
      });
    },
    []
  );

  const closeModal = useCallback((id: string) => {
    setModals((prev) => {
      const modal = prev.find((m) => m.id === id);
      if (modal) {
        modal.reject('closed');
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const value = useMemo<ModalContextValue>(
    () => ({
      modals,
      openModal,
      closeModal,
    }),
    [modals, openModal, closeModal]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within ModalProvider');
  }
  return context;
}
