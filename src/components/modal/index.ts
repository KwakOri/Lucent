// Modal 컴포넌트 및 타입 export

// Provider & Context
export { ModalProvider, useModalContext } from './ModalProvider';

// Hook
export { useModal } from './useModal';

// Layout Components
export { Overlay } from './Overlay';
export { ModalContainer } from './ModalContainer';
export { Header } from './Header';
export { Content } from './Content';
export { Footer } from './Footer';

// Types
export type {
  Modal,
  ModalProps,
  ModalOptions,
  ModalContextValue,
  OverlayProps,
  ModalContainerProps,
  HeaderProps,
  ContentProps,
  FooterProps,
  ModalComponent,
  OpenModalFunction,
  CloseModalFunction,
  ModalResult,
} from './types';
