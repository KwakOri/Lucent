'use client';

import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import type { ModalContainerProps } from './types';

const modalContainerVariants = cva(
  'bg-white rounded-lg shadow-xl overflow-hidden animate-modal-in',
  {
    variants: {
      size: {
        sm: 'w-full max-w-sm',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-lg',
        full: 'w-full h-full',
      },
      position: {
        center: '',
        bottom: 'absolute bottom-0 left-0 right-0 rounded-b-none',
      },
      tone: {
        default: '',
        danger: 'border-2 border-red-500',
        success: 'border-2 border-green-500',
        warning: 'border-2 border-yellow-500',
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
