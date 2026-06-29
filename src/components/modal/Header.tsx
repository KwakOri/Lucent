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
    return <div className={clsx('px-5 py-4 sm:px-6', className)}>{children}</div>;
  }

  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-4 border-b border-[#e7e3d3] px-5 py-4 sm:px-6',
        className
      )}
    >
      <h2 className="min-w-0 text-lg font-black leading-7 text-[#1a1a2e]">{title}</h2>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[#1a1a2e]/45 transition-colors hover:bg-[#f5f3e8] hover:text-[#1a1a2e]"
          aria-label="모달 닫기"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
