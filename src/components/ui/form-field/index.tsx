import { clsx } from "clsx";
import { HTMLAttributes, ReactNode } from "react";

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Field label text
   */
  label: string;
  /**
   * Field ID to connect label with input
   */
  htmlFor?: string;
  /**
   * Required field indicator
   */
  required?: boolean;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Help text to display when no error
   */
  help?: string;
  /**
   * Input element or any form control
   */
  children: ReactNode;
}

/**
 * FormField component - wrapper for form inputs with label, error, and help text
 *
 * Responsibilities:
 * - Display label with required indicator
 * - Manage error and help message layout
 * - Provide accessibility connections
 *
 * Priority: Error > Help
 *
 * @example
 * ```tsx
 * <FormField label="이메일" required error="이메일 형식이 올바르지 않습니다" htmlFor="email">
 *   <Input id="email" type="email" error />
 * </FormField>
 *
 * <FormField label="비밀번호" help="8자 이상 입력하세요" htmlFor="password">
 *   <Input id="password" type="password" />
 * </FormField>
 * ```
 */
export const FormField = ({
  label,
  htmlFor,
  required = false,
  error,
  help,
  children,
  className,
  ...props
}: FormFieldProps) => {
  const messageId = htmlFor ? `${htmlFor}-message` : undefined;

  return (
    <div className={clsx("flex flex-col gap-1.5", className)} {...props}>
      {/* Label */}
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-text-primary"
      >
        {label}
        {required && (
          <span className="ml-1 text-error-600" aria-label="필수">
            *
          </span>
        )}
      </label>

      {/* Input / Control */}
      {children}

      {/* Message Area - Error or Help */}
      {(error || help) && (
        <div
          id={messageId}
          className={clsx(
            "text-sm",
            error ? "text-error-600" : "text-text-secondary"
          )}
          role={error ? "alert" : undefined}
        >
          {error || help}
        </div>
      )}
    </div>
  );
};

FormField.displayName = "FormField";
