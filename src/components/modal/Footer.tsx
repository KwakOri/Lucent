'use client';

import { clsx } from 'clsx';
import type { FooterProps } from './types';

export function Footer({ className, children }: FooterProps) {
  return (
    <div
      className={clsx(
        'flex flex-col-reverse gap-2 border-t border-[#e7e3d3] bg-[#faf9f3] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 [&>button]:w-full sm:[&>button]:w-auto',
        className
      )}
    >
      {children}
    </div>
  );
}
