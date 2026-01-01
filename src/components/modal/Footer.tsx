'use client';

import { clsx } from 'clsx';
import type { FooterProps } from './types';

export function Footer({ className, children }: FooterProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50',
        className
      )}
    >
      {children}
    </div>
  );
}
