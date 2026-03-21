import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes, useId } from 'react';

const fileInputTriggerVariants = cva(
  [
    'flex w-full items-center justify-between gap-3 rounded-lg border font-medium transition-colors',
    'peer-focus-visible:border-primary-500',
    'peer-focus-visible:outline-none',
    'peer-focus-visible:ring-2',
    'peer-focus-visible:ring-primary-500/20',
  ],
  {
    variants: {
      state: {
        default: [
          'cursor-pointer border-neutral-200 bg-white text-text-primary hover:border-neutral-300',
        ],
        disabled: ['cursor-not-allowed border-neutral-200 bg-neutral-100 text-text-muted'],
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-14 px-4 text-base',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  },
);

export interface FileInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
    VariantProps<typeof fileInputTriggerVariants> {
  triggerLabel: string;
  triggerClassName?: string;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      triggerClassName,
      triggerLabel,
      id,
      size,
      state,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const resolvedId = id || generatedId;
    const resolvedState = disabled ? 'disabled' : state || 'default';

    return (
      <div className={clsx('w-full', className)}>
        <input
          ref={ref}
          id={resolvedId}
          type="file"
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <label
          htmlFor={resolvedId}
          className={clsx(
            fileInputTriggerVariants({ size, state: resolvedState }),
            disabled && 'pointer-events-none',
            triggerClassName,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <span className="inline-flex flex-shrink-0 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-text-secondary">
            찾아보기
          </span>
        </label>
      </div>
    );
  },
);

FileInput.displayName = 'FileInput';
