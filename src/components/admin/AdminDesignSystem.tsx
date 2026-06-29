'use client';

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

type AdminIcon = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean;
}>;

const surfaceVariants = cva(
  'rounded-[22px] border border-[#e7e3d3] bg-white shadow-none',
  {
    variants: {
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-5 sm:p-6',
      },
    },
    defaultVariants: {
      padding: 'md',
    },
  },
);

const linkCardVariants = cva(
  [
    'group block rounded-[20px] border border-[#e7e3d3] bg-white p-5 shadow-none',
    'transition hover:-translate-y-0.5 hover:border-[#d8d1bd] hover:shadow-[0_16px_34px_rgba(26,26,46,0.08)]',
  ],
  {
    variants: {
      emphasis: {
        default: '',
        primary: 'border-[#1a1a2e]/20',
      },
    },
    defaultVariants: {
      emphasis: 'default',
    },
  },
);

const iconBoxVariants = cva(
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]',
  {
    variants: {
      tone: {
        navy: 'bg-[#1a1a2e] text-white',
        gold: 'bg-[#fff4d5] text-[#a35200]',
        blue: 'bg-[#eaf3fc] text-[#4a88b9]',
        green: 'bg-[#eafaea] text-[#297c3b]',
        red: 'bg-[#fff0f0] text-[#ca2a30]',
        neutral: 'bg-[#f5f3e8] text-[#6f6a5e]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export const adminText = {
  base: 'text-[#1a1a2e]',
  muted: 'text-[#1a1a2e]/55',
  subtle: 'text-[#1a1a2e]/40',
};

export const adminButtonClass =
  '!h-11 !rounded-[12px] !border-0 !bg-[#f5f3e8] !px-4 !text-sm !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]';

export const adminPrimaryButtonClass =
  '!h-11 !rounded-[12px] !bg-[#1a1a2e] !px-4 !text-sm !font-bold !text-white hover:!bg-[#272743]';

export const adminDangerIconButtonClass =
  '!h-11 !w-11 !rounded-[14px] !border !border-[#f3d6d6] !bg-white !px-0 !text-[#ca2a30] hover:!bg-[#fff0f0]';

export const adminInputClass =
  'rounded-[12px] border-[#e7e3d3] bg-[#fdfcf4] text-[#1a1a2e] placeholder:text-[#1a1a2e]/35 focus:border-[#f59e0b] focus:ring-[#f59e0b]/20';

export const adminSelectClass =
  'h-11 rounded-[12px] border border-[#e7e3d3] bg-[#fdfcf4] px-3 text-sm font-semibold text-[#1a1a2e] focus:border-[#f59e0b] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/20';

export const adminTableContainerClass =
  'overflow-hidden rounded-[16px] border border-[#e7e3d3] bg-white';

export const adminTableHeadClass = 'bg-[#faf9f3]';

export const adminTableHeadCellClass =
  'px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#1a1a2e]/45';

export const adminTableBodyClass = 'divide-y divide-[#eee7d6] bg-white';

export const adminLegacyBridgeClass = [
  'text-[#1a1a2e]',
  '[&_.border-gray-200]:!border-[#e7e3d3]',
  '[&_.border-gray-300]:!border-[#e7e3d3]',
  '[&_.border-gray-400]:!border-[#d8d1bd]',
  '[&_.border-gray-100]:!border-[#eee7d6]',
  '[&_.bg-gray-50]:!bg-[#faf9f3]',
  '[&_.text-gray-900]:!text-[#1a1a2e]',
  '[&_.text-gray-800]:!text-[#1a1a2e]',
  '[&_.text-gray-700]:!text-[#1a1a2e]/70',
  '[&_.text-gray-600]:!text-[#1a1a2e]/60',
  '[&_.text-gray-500]:!text-[#1a1a2e]/50',
  '[&_section.rounded-xl]:!rounded-[22px]',
  '[&_section.rounded-lg]:!rounded-[22px]',
  '[&_.rounded-xl.border]:!rounded-[16px]',
  '[&_.rounded-lg.border]:!rounded-[14px]',
  '[&_thead.bg-gray-50]:!bg-[#faf9f3]',
  '[&_input.border-neutral-200]:!border-[#e7e3d3]',
  '[&_input.border-neutral-200]:!bg-[#fdfcf4]',
  '[&_textarea.border-neutral-200]:!border-[#e7e3d3]',
  '[&_textarea.border-neutral-200]:!bg-[#fdfcf4]',
  '[&_select.border-neutral-200]:!border-[#e7e3d3]',
  '[&_select.border-neutral-200]:!bg-[#fdfcf4]',
].join(' ');

export function AdminSurface({
  children,
  className,
  padding,
}: {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof surfaceVariants>) {
  return (
    <section className={clsx(surfaceVariants({ padding }), className)}>
      {children}
    </section>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a35200]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-black leading-tight text-[#1a1a2e] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#1a1a2e]/55">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminStatCard({
  label,
  value,
  caption,
  className,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={clsx('min-h-[118px] rounded-[16px] border border-[#e7e3d3] bg-white px-5 py-5', className)}>
      <p className="text-xs font-black uppercase tracking-wide text-[#1a1a2e]/40">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-[#1a1a2e]">{value}</p>
      {caption ? <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">{caption}</p> : null}
    </div>
  );
}

export function AdminLinkCard({
  href,
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  meta,
  emphasis,
}: {
  href: string;
  icon: AdminIcon;
  title: string;
  description: string;
  tone?: VariantProps<typeof iconBoxVariants>['tone'];
  meta?: ReactNode;
} & VariantProps<typeof linkCardVariants>) {
  return (
    <Link href={href} className={linkCardVariants({ emphasis })}>
      <div className="flex items-start justify-between gap-4">
        <div className={iconBoxVariants({ tone })}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <ArrowRight
          className="h-5 w-5 shrink-0 text-[#1a1a2e]/30 transition group-hover:translate-x-0.5 group-hover:text-[#a35200]"
          aria-hidden
        />
      </div>
      <div className="mt-5">
        <h2 className="text-base font-black text-[#1a1a2e] group-hover:text-[#a35200]">
          {title}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[#1a1a2e]/55">
          {description}
        </p>
        {meta ? <div className="mt-4">{meta}</div> : null}
      </div>
    </Link>
  );
}
