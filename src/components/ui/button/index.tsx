import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-bold transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:cursor-not-allowed",
  ],
  {
    variants: {
      intent: {
        primary: [
          "bg-primary-700",
          "text-text-inverse",
          "hover:bg-primary-600",
          "focus-visible:ring-primary-500",
          "disabled:bg-neutral-200",
          "disabled:text-text-muted",
        ],
        secondary: [
          "bg-neutral-100",
          "text-text-primary",
          "hover:bg-neutral-200",
          "focus-visible:ring-neutral-300",
          "disabled:bg-neutral-100",
          "disabled:text-text-muted",
        ],
        danger: [
          "bg-error-600",
          "text-text-inverse",
          "hover:bg-error-500",
          "focus-visible:ring-error-500",
          "disabled:bg-neutral-200",
          "disabled:text-text-muted",
        ],
        neutral: [
          "bg-transparent",
          "text-text-primary",
          "border border-neutral-200",
          "hover:bg-neutral-50",
          "focus-visible:ring-neutral-300",
          "disabled:border-neutral-200",
          "disabled:text-text-muted",
        ],
        header: [
          "bg-transparent",
          "text-[rgb(30,30,30)]",
          "hover:bg-[rgb(102,181,243)]",
          "hover:text-white",
          "rounded-xl",
          "focus-visible:ring-[rgb(102,181,243)]",
          "disabled:text-text-muted",
        ],
        headerScrolled: [
          "bg-transparent",
          "text-white",
          "hover:bg-[rgb(102,181,243)]",
          "hover:text-white",
          "rounded-xl",
          "focus-visible:ring-[rgb(102,181,243)]",
          "disabled:text-text-muted",
        ],
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-md",
        md: "h-11 px-4 text-base rounded-lg",
        lg: "h-14 px-6 text-lg rounded-lg",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
      loading: {
        true: "opacity-70",
        false: "",
      },
    },
    compoundVariants: [
      {
        intent: "header",
        size: "sm",
        className: "rounded-xl",
      },
      {
        intent: "header",
        size: "md",
        className: "rounded-xl",
      },
      {
        intent: "header",
        size: "lg",
        className: "rounded-xl",
      },
      {
        intent: "headerScrolled",
        size: "sm",
        className: "rounded-xl",
      },
      {
        intent: "headerScrolled",
        size: "md",
        className: "rounded-xl",
      },
      {
        intent: "headerScrolled",
        size: "lg",
        className: "rounded-xl",
      },
    ],
    defaultVariants: {
      intent: "primary",
      size: "md",
      fullWidth: false,
      loading: false,
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      intent,
      size,
      fullWidth,
      loading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          buttonVariants({ intent, size, fullWidth, loading }),
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
