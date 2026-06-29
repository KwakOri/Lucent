'use client';

import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import type { ModalContainerProps } from './types';

const modalContainerVariants = cva(
  [
    'relative flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden border border-[#e7e3d3] bg-white shadow-[0_24px_70px_rgba(26,26,46,0.22)] animate-modal-in',
    'w-full rounded-[22px]',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-2xl',
        full: 'h-[calc(100dvh-1.5rem)] max-w-5xl',
      },
      position: {
        center: '',
        bottom: 'absolute bottom-0 left-0 right-0 max-h-[calc(100dvh-0.75rem)] rounded-b-none sm:relative sm:rounded-[22px]',
      },
      tone: {
        default: '',
        danger: 'border-[#f3d6d6]',
        success: 'border-[#cfead1]',
        warning: 'border-[#ead8a4]',
      },
    },
    defaultVariants: {
      size: 'md',
      position: 'center',
      tone: 'default',
    },
  }
);

export function ModalContainer({
  size,
  position,
  tone,
  className,
  children,
}: ModalContainerProps) {
  return (
    <div
      className={clsx(
        modalContainerVariants({ size, position, tone }),
        className
      )}
      onClick={(e) => e.stopPropagation()} // 배경 클릭 방지
    >
      {children}
    </div>
  );
}
