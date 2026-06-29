'use client';

import { clsx } from 'clsx';
import type { ContentProps } from './types';

export function Content({ className, children }: ContentProps) {
  return (
    <div className={clsx('min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-6 text-[#1a1a2e]/70 sm:px-6', className)}>
      {children}
    </div>
  );
}
