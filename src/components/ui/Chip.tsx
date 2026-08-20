import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-sans text-[length:var(--fs-small,0.75rem)] px-3.5 py-1.5 transition-colors border";

const variants = {
  /** Category/tab filter — selected reads as a solid wine pill. */
  filter: {
    active: "bg-wine text-ink border-wine",
    inactive: "border-ink-border text-parchment-dim hover:text-parchment hover:border-wine/50 bg-transparent",
  },
  /** Neutral action pill (quick actions row) — same look whether "active" or not. */
  action: {
    active: "bg-ink-card border-ink-border text-parchment-dim hover:text-parchment hover:border-wine/40",
    inactive: "bg-ink-card border-ink-border text-parchment-dim hover:text-parchment hover:border-wine/40",
  },
};

type Variant = keyof typeof variants;

function chipClass(variant: Variant, active: boolean, className?: string) {
  return cn(base, variants[variant][active ? "active" : "inactive"], className);
}

export function Chip({
  className,
  variant = "filter",
  active = false,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; active?: boolean }) {
  return <button className={chipClass(variant, active, className)} {...props} />;
}

export function LinkChip({
  className,
  variant = "filter",
  active = false,
  href,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; active?: boolean; href: string }) {
  return <Link href={href} className={chipClass(variant, active, className)} {...props} />;
}
