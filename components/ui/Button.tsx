import React from 'react';

export interface ButtonProps {
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'ghost';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Button contents
   */
  children: React.ReactNode;
  /**
   * Click handler
   */
  onClick?: () => void;
}

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
}: ButtonProps) => {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: `
      bg-[var(--color-primary-700)]
      text-[var(--color-text-inverse)]
      hover:bg-[var(--color-primary-600)]
      focus:ring-[var(--color-primary-500)]
      disabled:bg-[var(--color-neutral-200)]
      disabled:text-[var(--color-text-muted)]
    `,
    secondary: `
      bg-[var(--color-neutral-100)]
      text-[var(--color-text-primary)]
      hover:bg-[var(--color-neutral-200)]
      focus:ring-[var(--color-neutral-300)]
      disabled:bg-[var(--color-neutral-100)]
      disabled:text-[var(--color-text-muted)]
    `,
    ghost: `
      bg-transparent
      text-[var(--color-text-primary)]
      hover:bg-[var(--color-neutral-100)]
      focus:ring-[var(--color-neutral-300)]
      disabled:text-[var(--color-text-muted)]
    `,
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type="button"
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
