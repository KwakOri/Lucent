import { HTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Loading size
   */
  size?: "sm" | "md" | "lg";
  /**
   * Loading text
   */
  text?: string;
  /**
   * Full screen loading
   */
  fullScreen?: boolean;
}

/**
 * Loading component - shows loading state with spinner
 *
 * Types:
 * - Inline: Small spinner for buttons, inputs
 * - Section: Loading for specific section
 * - Full screen: Loading for entire page
 *
 * @example
 * ```tsx
 * <Loading />
 * <Loading text="불러오는 중입니다" />
 * <Loading size="lg" fullScreen />
 * ```
 */
export const Loading = ({
  size = "md",
  text,
  fullScreen = false,
  className,
  ...props
}: LoadingProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const content = (
    <div
      className={clsx(
        "flex min-w-0 flex-col items-center justify-center gap-3 text-center",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...props}
    >
      <Loader2
        className={clsx(sizeClasses[size], "animate-spin text-[#f59e0b]")}
      />
      {text && (
        <p className="max-w-[min(22rem,calc(100vw-3rem))] text-sm font-medium leading-6 text-[#1a1a2e]/60">
          {text}
        </p>
      )}
      <span className="sr-only">로딩 중</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f9f9ed]/85 px-4 backdrop-blur-sm">
        <div className="rounded-[22px] border border-[#e7e3d3] bg-white px-8 py-7 shadow-[0_18px_44px_rgba(26,26,46,0.10)]">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

Loading.displayName = "Loading";
