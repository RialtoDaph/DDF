import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Kitchen's flat share of each day's tip total — the rest is split evenly
 * across that day's workers. Stored on each row at entry time rather than
 * recomputed here, so changing this later never rewrites history. */
export const KITCHEN_SHARE_RATIO = 0.4;

export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** The Monday (as "YYYY-MM-DD") of the week containing this date — same
 * convention as the Wochencheck period in checklists/shared/lib.ts. */
export function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekRange(weekStart: string): { start: string; end: string } {
  return { start: weekStart, end: addDays(weekStart, 6) };
}

export function todayInBerlin(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

export interface TipDay {
  id: string;
  tip_date: string;
  total_amount: number;
  kitchen_share: number;
  staff_share: number;
  workers: { id: string; name: string }[];
}

export interface WeeklyTipSummary {
  weekStart: string;
  weekEnd: string;
  totalAmount: number;
  kitchenTotal: number;
  staffTotals: { userId: string; name: string; amount: number }[];
  days: TipDay[];
}

/** Every day's tip entry within [weekStart, weekStart+6], plus each
 * person's summed share across the days they worked. */
export async function getWeeklyTipSummary(
  supabase: SupabaseClient<Database>,
  outletId: string,
  weekStart: string,
): Promise<WeeklyTipSummary> {
  const { start, end } = weekRange(weekStart);

  const { data } = await supabase
    .from("tip_days")
    .select(
      "id, tip_date, total_amount, kitchen_share, staff_share, tip_day_workers(user_id, users(id, name))",
    )
    .eq("outlet_id", outletId)
    .gte("tip_date", start)
    .lte("tip_date", end)
    .order("tip_date", { ascending: true });

  const rows = data ?? [];

  const staffTotalsMap = new Map<string, { name: string; amount: number }>();
  let kitchenTotal = 0;
  let totalAmount = 0;

  const days: TipDay[] = rows.map((d) => {
    const workerRows =
      (d.tip_day_workers as unknown as { user_id: string; users: { id: string; name: string } | null }[]) ?? [];
    const perPerson = workerRows.length > 0 ? d.staff_share / workerRows.length : 0;

    for (const w of workerRows) {
      const name = w.users?.name ?? "—";
      const prev = staffTotalsMap.get(w.user_id)?.amount ?? 0;
      staffTotalsMap.set(w.user_id, { name, amount: prev + perPerson });
    }

    kitchenTotal += d.kitchen_share;
    totalAmount += d.total_amount;

    return {
      id: d.id,
      tip_date: d.tip_date,
      total_amount: d.total_amount,
      kitchen_share: d.kitchen_share,
      staff_share: d.staff_share,
      workers: workerRows.map((w) => ({ id: w.user_id, name: w.users?.name ?? "—" })),
    };
  });

  const staffTotals = Array.from(staffTotalsMap.entries())
    .map(([userId, v]) => ({ userId, name: v.name, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount);

  return { weekStart: start, weekEnd: end, totalAmount, kitchenTotal, staffTotals, days };
}
