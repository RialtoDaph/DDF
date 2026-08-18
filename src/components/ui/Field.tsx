import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const fieldBase =
  "w-full rounded-md border border-ink-border bg-ink-raised px-3 py-2 text-parchment placeholder:text-parchment-dim/60 outline-none focus:border-brass focus:ring-1 focus:ring-brass";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("block text-xs uppercase tracking-wide text-parchment-dim mb-1", className)}
      {...props}
    />
  );
}
