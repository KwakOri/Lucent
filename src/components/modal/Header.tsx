'use client';

import { clsx } from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { HeaderProps } from './types';

export function Header({
  title,
  showCloseButton = true,
  onClose,
  className,
  children,
}: HeaderProps) {
  // 커스텀 헤더가 있으면 그대로 렌더링
  if (children) {
    return <div className={clsx('px-6 py-4', className)}>{children}</div>;
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-between px-6 py-4 border-b',
        className
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="모달 닫기"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
