import { cn } from "@/lib/utils";

/**
 * Visual stock-vs-par gauge. Below 50% of par reads amber, at/below 20% reads warning red.
 */
export function GaugeBar({
  current,
  par,
  unit,
  className,
}: {
  current: number;
  par: number;
  unit?: string;
  className?: string;
}) {
  const ratio = par > 0 ? current / par : current > 0 ? 1 : 0;
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const critical = ratio <= 0.2;
  const low = ratio > 0.2 && ratio <= 0.5;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="tabular text-sm text-parchment">
          {current}
          {unit ? ` ${unit}` : ""}
        </span>
        <span className="tabular text-xs text-parchment-dim">Soll {par}{unit ? ` ${unit}` : ""}</span>
      </div>
      <div className="h-2 rounded-full bg-ink-raised overflow-hidden border border-ink-border">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            critical ? "bg-warn" : low ? "bg-wine" : "bg-done",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
