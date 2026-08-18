import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("paper-card p-4", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="font-serif text-lg text-parchment leading-tight">{title}</h3>
        {subtitle && <p className="text-sm text-parchment-dim mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
