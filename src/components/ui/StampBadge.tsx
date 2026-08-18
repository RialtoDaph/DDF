import { cn } from "@/lib/utils";

export function StampBadge({
  children,
  variant = "done",
  className,
}: {
  children: React.ReactNode;
  variant?: "done" | "warn";
  className?: string;
}) {
  return (
    <span className={cn("stamp", variant === "warn" && "stamp-warn", className)}>
      {children}
    </span>
  );
}
