import { InputHTMLAttributes, forwardRef, useId } from "react";
import { clsx } from "clsx";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /**
   * Switch label
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
 * Switch component for ON/OFF state toggle
 *
 * Different from Checkbox - Switch represents immediate state change
 *
 * @example
 * ```tsx
 * <Switch label="알림 받기" />
 * <Switch label="자동 로그인" checked />
 * <Switch label="마케팅 수신" disabled />
 * ```
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
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
    const switchSize = {
      sm: {
        track: "w-9 h-5",
        thumb: "w-4 h-4",
        translate: "peer-checked:translate-x-4",
      },
      md: {
        track: "w-11 h-6",
        thumb: "w-5 h-5",
        translate: "peer-checked:translate-x-5",
      },
    };

    const inputId = id || `switch-${generatedId}`;
    const currentSize = switchSize[size];

    return (
      <div className={clsx("flex items-center gap-3", className)}>
        <div className="relative inline-flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            role="switch"
            className="peer sr-only"
            disabled={disabled}
            aria-invalid={error}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={clsx(
              currentSize.track,
              "flex items-center rounded-full transition-colors cursor-pointer",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-500",
              error
                ? "bg-neutral-200 peer-checked:bg-error-600"
                : "bg-neutral-200 peer-checked:bg-primary-700",
              disabled &&
                "cursor-not-allowed bg-neutral-100 peer-checked:bg-neutral-200"
            )}
          >
            <span
              className={clsx(
                currentSize.thumb,
                currentSize.translate,
                "inline-block rounded-full bg-neutral-0 transition-transform duration-200 ease-in-out",
                "ml-0.5"
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

Switch.displayName = "Switch";
