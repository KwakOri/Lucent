'use client';

import { clsx } from 'clsx';
import type { ContentProps } from './types';

export function Content({ className, children }: ContentProps) {
  return (
    <div className={clsx('px-6 py-4 overflow-y-auto', className)}>
      {children}
    </div>
  );
}
