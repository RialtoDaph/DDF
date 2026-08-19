import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Total volume for a stock count given a per-unit volume in ml, e.g. "12 Flaschen" @ 700 ml → "≈ 8,4 L". */
export function formatTotalVolume(quantity: number, unitVolumeMl: number | null): string | null {
  if (!unitVolumeMl) return null;
  const totalMl = quantity * unitVolumeMl;
  const liters = totalMl / 1000;
  return liters >= 1 ? `≈ ${liters.toLocaleString("de-DE", { maximumFractionDigits: 1 })} L` : `≈ ${Math.round(totalMl)} ml`;
}
