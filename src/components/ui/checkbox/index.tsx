import { InputHTMLAttributes, forwardRef, ReactNode, useId, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { clsx } from "clsx";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /**
   * Checkbox label
   */
  label?: ReactNode;
  /**
   * Error state - shows error styling
   */
  error?: boolean;
  /**
   * Size variant
   */
  size?: "sm" | "md";
  /**
   * Indeterminate state (for partial selection)
   */
  indeterminate?: boolean;
}

/**
 * Checkbox component
 *
 * Must be used with a label for accessibility
 *
 * @example
 * ```tsx
 * <Checkbox label="이용약관에 동의합니다" />
 * <Checkbox label="마케팅 수신 동의" checked />
 * <Checkbox label="필수 동의" error />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      error,
      disabled,
      size = "md",
      id,
      indeterminate,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const internalRef = useRef<HTMLInputElement>(null);

    // Handle indeterminate state
    useEffect(() => {
      const input = internalRef.current;
      if (input) {
        input.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
    };

    const checkIconSize = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
    };

    return (
      <div className={clsx("flex items-start gap-2", className)}>
        <div className="relative flex items-center">
          <input
            ref={(el) => {
              internalRef.current = el;
              if (typeof ref === 'function') {
                ref(el);
              } else if (ref) {
                ref.current = el;
              }
            }}
            type="checkbox"
            id={inputId}
            className="peer sr-only"
            disabled={disabled}
            aria-invalid={error}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={clsx(
              sizeClasses[size],
              "flex items-center justify-center rounded border-2 transition-colors cursor-pointer",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-500",
              error
                ? "border-error-500 peer-checked:bg-error-600 peer-checked:border-error-600"
                : "border-neutral-300 peer-checked:bg-primary-700 peer-checked:border-primary-700",
              disabled &&
                "cursor-not-allowed border-neutral-200 peer-checked:bg-neutral-200 peer-checked:border-neutral-200"
            )}
          >
            <Check
              className={clsx(
                checkIconSize[size],
                "text-text-inverse opacity-0 peer-checked:opacity-100 transition-opacity"
              )}
            />
          </label>
        </div>
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              "text-sm cursor-pointer select-none",
              error ? "text-error-600" : "text-text-primary",
              disabled && "cursor-not-allowed text-text-muted"
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
