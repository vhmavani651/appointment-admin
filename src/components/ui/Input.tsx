import type { InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export default function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={twMerge(
        "h-10 w-full rounded-lg border border-border bg-white px-3.5 text-sm text-text placeholder:text-slate-400 hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
        className
      )}
      {...props}
    />
  );
}
