'use client';

import { useEffect } from 'react';
import type { OverlayProps } from './types';

export function Overlay({
  id,
  onClose,
  disableBackdropClick = false,
  disableEscapeKey = false,
  zIndex = 1000,
  children,
}: OverlayProps) {
  // 배경 클릭 처리
  const handleBackdropClick = (e: React.MouseEvent) => {
    // 자식 요소 클릭은 무시
    if (e.target === e.currentTarget && !disableBackdropClick) {
      onClose();
    }
  };

  // ESC 키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscapeKey) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, disableEscapeKey]);

  // 모달 내부 키 이벤트 격리 (외부 form에 전파 방지)
  useEffect(() => {
    const modalElement = document.getElementById(id);
    if (!modalElement) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter, Space 등 form submit을 트리거할 수 있는 키들을 모달 내부에서 격리
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation(); // 외부로 전파되지 않도록 차단
      }
    };

    // Capture phase에서 이벤트를 먼저 잡아서 처리
    modalElement.addEventListener('keydown', handleKeyDown, true);

    return () => {
      modalElement.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [id]);

  // 스크롤 잠금
  useEffect(() => {
    // body 스크롤 잠금
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // 포커스 트랩
  useEffect(() => {
    const modalElement = document.getElementById(id);
    if (!modalElement) return;

    // 포커스 가능한 요소들
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // 첫 번째 요소로 포커스 이동
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [id]);

  return (
    <div
      id={id}
      className="fixed inset-0 flex items-end justify-center overflow-y-auto bg-[#1a1a2e]/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ zIndex }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}
