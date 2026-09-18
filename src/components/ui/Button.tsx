import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "outlined" | "ghost" | "danger";
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  filled: "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark",
  outlined:
    "border border-primary text-primary bg-white hover:bg-primary-light",
  ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
};

export default function Button({
  variant = "filled",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // twMerge resolves conflicting utilities (e.g. base "px-4 py-2" vs an
      // icon-only override's "p-0") by keeping whichever was passed last,
      // instead of both landing in the stylesheet and fighting unpredictably.
      className={twMerge(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
}
