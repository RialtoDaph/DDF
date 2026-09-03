import Image from "next/image";
import { cn } from "@/lib/utils";

const ALT = "Bar Der Dicke Franz";

/**
 * The full mark. Ships in a parchment-on-dark variant because the original
 * artwork is a black silhouette on white and would vanish against the app's
 * background — `logo.png` keeps the original colours for light surfaces.
 */
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo-dark.png"
      alt={ALT}
      width={998}
      height={1200}
      priority={priority}
      className={cn("select-none", className)}
    />
  );
}

/** Just the wine glass — the lettering is unreadable below ~120px wide. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/glass.png"
      alt=""
      aria-hidden
      width={764}
      height={764}
      className={cn("select-none", className)}
    />
  );
}

/** Just Franz's head (top hat + mustache), cropped from the main mark — used where the assistant needs a face rather than the glass. */
export function FranzFace({ className }: { className?: string }) {
  return (
    <Image
      src="/franz-face.png"
      alt=""
      aria-hidden
      width={406}
      height={433}
      className={cn("select-none", className)}
    />
  );
}
