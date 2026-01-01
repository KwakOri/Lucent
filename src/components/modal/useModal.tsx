'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalContext } from './ModalProvider';
import { Overlay } from './Overlay';
import { ModalContainer } from './ModalContainer';
import type { Modal, ModalOptions, ModalProps } from './types';

interface UseModalReturn {
  openModal: <T = void>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: React.ComponentType<any>,
    options?: ModalOptions
  ) => Promise<T>;
  closeModal: (id?: string) => void;
  renderModal: () => React.ReactPortal | null;
}

export function useModal(): UseModalReturn {
  const context = useModalContext();
  const modalIdsRef = useRef<Set<string>>(new Set());
  const closeModalRef = useRef(context.closeModal);

  // closeModal 함수를 항상 최신으로 유지
  useEffect(() => {
    closeModalRef.current = context.closeModal;
  }, [context.closeModal]);

  // openModal 래핑
  const openModal = useCallback(
    async <T = void>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component: React.ComponentType<any>,
      options?: ModalOptions
    ): Promise<T> => {
      // 고유 ID 생성
      const id = crypto.randomUUID();
      modalIdsRef.current.add(id);

      try {
        // ID를 options에 포함하여 Context의 openModal 호출
        const result = await context.openModal<T>(component, { ...options, id });
        return result;
      } finally {
        // 모달이 닫히면 ID 제거
        modalIdsRef.current.delete(id);
      }
    },
    [context]
  );

  // closeModal 래핑
  const closeModal = useCallback(
    (id?: string) => {
      if (id) {
        // 특정 모달 닫기
        context.closeModal(id);
        modalIdsRef.current.delete(id);
      } else {
        // 현재 Hook에서 연 모든 모달 닫기
        modalIdsRef.current.forEach((modalId) => {
          context.closeModal(modalId);
        });
        modalIdsRef.current.clear();
      }
    },
    [context]
  );

  // cleanup (컴포넌트 언마운트 시에만 실행)
  useEffect(() => {
    return () => {
      // cleanup: 모든 모달 닫기
      modalIdsRef.current.forEach((id) => {
        closeModalRef.current(id);
      });
      modalIdsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열: 마운트/언마운트 시에만 실행

  // renderModal
  const renderModal = useCallback(() => {
    if (context.modals.length === 0) return null;

    // SSR 체크: 서버 사이드에서는 렌더링하지 않음
    if (typeof window === 'undefined') return null;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      console.warn('modal-root element not found');
      return null;
    }

    return createPortal(
      <>
        {context.modals.map((modal) => (
          <ModalRenderer key={modal.id} modal={modal} />
        ))}
      </>,
      modalRoot
    );
  }, [context.modals]);

  return {
    openModal,
    closeModal,
    renderModal,
  };
}

// ModalRenderer 내부 컴포넌트
function ModalRenderer<T = unknown>({ modal }: { modal: Modal<T> }) {
  const { id, component: Component, options, resolve, reject } = modal;
  const context = useModalContext();

  const handleSubmit = useCallback(
    (value: T) => {
      resolve(value);
      context.closeModal(id);
    },
    [resolve, context, id]
  );

  const handleAbort = useCallback(
    (reason?: unknown) => {
      reject(reason ?? 'aborted');
      context.closeModal(id);
    },
    [reject, context, id]
  );

  return (
    <Overlay
      id={id}
      onClose={() => handleAbort('backdrop')}
      disableBackdropClick={options?.disableBackdropClick}
      disableEscapeKey={options?.disableEscapeKey}
    >
      <ModalContainer>
        <Component
          onSubmit={handleSubmit}
          onAbort={handleAbort}
          {...options}
        />
      </ModalContainer>
    </Overlay>
  );
}
