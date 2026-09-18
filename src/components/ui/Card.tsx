import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export default function Card({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={twMerge(
        "rounded-2xl border border-border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
