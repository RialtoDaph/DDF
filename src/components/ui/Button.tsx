import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-sans text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none px-4 py-2";

const variants = {
  primary: "bg-brass text-ink hover:bg-brass-soft",
  secondary: "border border-ink-border text-parchment hover:border-brass hover:text-brass bg-transparent",
  ghost: "text-parchment-dim hover:text-parchment hover:bg-ink-raised",
  danger: "border border-warn text-warn hover:bg-warn-soft",
};

type Variant = keyof typeof variants;

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function LinkButton({
  className,
  variant = "primary",
  href,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; href: string }) {
  return <Link href={href} className={cn(base, variants[variant], className)} {...props} />;
}
