// src/components/modal/types.ts

import type { ReactNode, ComponentType } from 'react';

// ========================================
// 핵심 타입
// ========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Modal<T = any> {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  options?: ModalOptions;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export interface ModalProps<T = void> {
  onSubmit: (value: T) => void;
  onAbort: (reason?: unknown) => void;
}

export interface ModalOptions {
  id?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'center' | 'bottom';
  disableBackdropClick?: boolean;
  disableEscapeKey?: boolean;
  showCloseButton?: boolean;
  tone?: 'default' | 'danger' | 'success' | 'warning';
  disableAnimation?: boolean;
  zIndex?: number;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ModalContextValue {
  modals: Modal[];
  openModal: <T = void>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: ComponentType<any>,
    options?: ModalOptions
  ) => Promise<T>;
  closeModal: (id: string) => void;
}

// ========================================
// 컴포넌트 Props 타입
// ========================================

export interface OverlayProps {
  id: string;
  onClose: () => void;
  disableBackdropClick?: boolean;
  disableEscapeKey?: boolean;
  zIndex?: number;
  children: ReactNode;
}

export interface ModalContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'center' | 'bottom';
  tone?: 'default' | 'danger' | 'success' | 'warning';
  className?: string;
  children: ReactNode;
}

export interface HeaderProps {
  title?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
  children?: ReactNode;
}

export interface ContentProps {
  className?: string;
  children: ReactNode;
}

export interface FooterProps {
  className?: string;
  children: ReactNode;
}

// ========================================
// 유틸리티 타입
// ========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModalComponent<T = void> = ComponentType<any>;

export type OpenModalFunction = <T = void>(
  component: ModalComponent<T>,
  options?: ModalOptions
) => Promise<T>;

export type CloseModalFunction = (id: string) => void;

export type ModalResult<T> = T | 'closed' | 'aborted';
