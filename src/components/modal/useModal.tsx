'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useModalContext } from './ModalProvider';
import type { ModalOptions } from './types';

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
    const modalIds = modalIdsRef.current;
    return () => {
      // cleanup: 모든 모달 닫기
      modalIds.forEach((id) => {
        closeModalRef.current(id);
      });
      modalIds.clear();
    };
  }, []); // 빈 배열: 마운트/언마운트 시에만 실행

  // renderModal
  const renderModal = useCallback(() => {
    return null;
  }, []);

  return {
    openModal,
    closeModal,
    renderModal,
  };
}
