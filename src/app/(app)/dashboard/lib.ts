import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Reconstructs a `days`-point stock trend ending at `currentStock` by
 * walking real stock_movements backward day by day — no synthetic data.
 */
export function buildStockTrend(
  currentStock: number,
  movements: { type: "in" | "out"; quantity: number; date: string }[],
  days = 7,
): number[] {
  const today = new Date();
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const netByDay = new Map<string, number>();
  for (const m of movements) {
    const day = m.date.slice(0, 10);
    const signed = m.type === "in" ? m.quantity : -m.quantity;
    netByDay.set(day, (netByDay.get(day) ?? 0) + signed);
  }

  const levels = new Array<number>(days);
  levels[days - 1] = currentStock;
  for (let i = days - 1; i > 0; i--) {
    levels[i - 1] = levels[i] - (netByDay.get(dayKeys[i]) ?? 0);
  }

  return levels.map((v) => Math.max(0, v));
}

/** SVG polyline points for a `buildStockTrend()` result, viewBox "0 0 100 28". */
export function sparkPoints(levels: number[]): string {
  const max = Math.max(...levels, 1);
  return levels.map((v, idx) => `${(idx / (levels.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
}

/** Consecutive days (ending today) where any submission for this template was approved. */
export async function computeApprovedStreak(
  supabase: SupabaseClient<Database>,
  templateId: string,
  maxDays = 30,
): Promise<number> {
  const today = new Date();
  const since = new Date(today);
  since.setDate(since.getDate() - maxDays);

  const { data } = await supabase
    .from("checklist_submissions")
    .select("period_start")
    .eq("template_id", templateId)
    .eq("status", "approved")
    .gte("period_start", since.toISOString().slice(0, 10));

  const approvedDays = new Set((data ?? []).map((d) => d.period_start));

  let streak = 0;
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (!approvedDays.has(d.toISOString().slice(0, 10))) break;
    streak++;
  }
  return streak;
}
