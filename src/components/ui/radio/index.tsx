import { InputHTMLAttributes, forwardRef, useId } from "react";
import { clsx } from "clsx";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /**
   * Radio label
   */
  label?: string;
  /**
   * Error state - shows error styling
   */
  error?: boolean;
  /**
   * Size variant
   */
  size?: "sm" | "md";
}

/**
 * Radio component
 *
 * Must be used in a group with the same name attribute
 *
 * @example
 * ```tsx
 * <Radio name="delivery" value="normal" label="일반 배송" />
 * <Radio name="delivery" value="express" label="빠른 배송" checked />
 * ```
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      label,
      error,
      disabled,
      size = "md",
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
    };

    const dotSize = {
      sm: "w-2 h-2",
      md: "w-2.5 h-2.5",
    };

    const inputId = id || `radio-${generatedId}`;

    return (
      <div className={clsx("flex items-start gap-2", className)}>
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="radio"
            id={inputId}
            className="peer sr-only"
            disabled={disabled}
            aria-invalid={error || undefined}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={clsx(
              sizeClasses[size],
              "flex items-center justify-center rounded-full border-2 transition-colors cursor-pointer",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-500",
              error
                ? "border-error-500 peer-checked:border-error-600"
                : "border-neutral-300 peer-checked:border-primary-700",
              disabled &&
                "cursor-not-allowed border-neutral-200 peer-checked:border-neutral-200"
            )}
          >
            <span
              className={clsx(
                dotSize[size],
                "rounded-full transition-all",
                error
                  ? "peer-checked:bg-error-600"
                  : "peer-checked:bg-primary-700",
                disabled && "peer-checked:bg-neutral-200",
                "scale-0 peer-checked:scale-100"
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

Radio.displayName = "Radio";
