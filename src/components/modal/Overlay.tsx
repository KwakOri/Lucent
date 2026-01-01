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
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}
