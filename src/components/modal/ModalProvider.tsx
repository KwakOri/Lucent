"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ModalContainer } from "./ModalContainer";
import { Overlay } from "./Overlay";
import type { Modal, ModalContextValue, ModalOptions } from "./types";

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);

  const openModal = useCallback(
    <T = void,>(
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
        modal.reject("closed");
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

  const renderModalPortal = () => {
    if (typeof document === "undefined" || modals.length === 0) {
      return null;
    }

    const modalRoot = document.getElementById("modal-root");
    if (!modalRoot) {
      return null;
    }

    return createPortal(
      <>
        {modals.map((modal) => (
          <ModalRenderer key={modal.id} modal={modal} closeModal={closeModal} />
        ))}
      </>,
      modalRoot,
    );
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {renderModalPortal()}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within ModalProvider");
  }
  return context;
}

function ModalRenderer<T = unknown>({
  modal,
  closeModal,
}: {
  modal: Modal<T>;
  closeModal: (id: string) => void;
}) {
  const { id, component: Component, options, resolve, reject } = modal;

  const handleSubmit = useCallback(
    (value: T) => {
      resolve(value);
      closeModal(id);
    },
    [closeModal, id, resolve],
  );

  const handleAbort = useCallback(
    (reason?: unknown) => {
      reject(reason ?? "aborted");
      closeModal(id);
    },
    [closeModal, id, reject],
  );

  return (
    <Overlay
      id={id}
      onClose={() => handleAbort("backdrop")}
      disableBackdropClick={options?.disableBackdropClick}
      disableEscapeKey={options?.disableEscapeKey}
      zIndex={options?.zIndex}
    >
      <ModalContainer
        size={options?.size}
        position={options?.position}
        tone={options?.tone}
        className={options?.className}
      >
        <Component
          onSubmit={handleSubmit}
          onAbort={handleAbort}
          {...options}
        />
      </ModalContainer>
    </Overlay>
  );
}
