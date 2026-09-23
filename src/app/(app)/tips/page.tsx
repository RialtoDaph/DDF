import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireProfile, canManageTips } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import { getWeeklyTipSummary, mondayOf, todayInBerlin, weekRange, addDays } from "@/lib/tips";
import { TipDayManager } from "./TipDayManager";

function formatDe(dateStr: string): string {
  return dateStr.split("-").reverse().join(".");
}

export default async function TipsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const profile = await requireProfile();
  if (!profile.outlet_id) redirect("/dashboard");

  const { week } = await searchParams;
  const weekStart = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? mondayOf(week) : mondayOf(todayInBerlin());
  const { end: weekEnd } = weekRange(weekStart);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);
  const today = todayInBerlin();
  // Default the entry form's date to today only while viewing the week that
  // contains today — otherwise (backfilling a past/future week) default to
  // that week's Monday, so a saved entry doesn't silently land outside the
  // week currently on screen.
  const defaultEntryDate = today >= weekStart && today <= weekEnd ? today : weekStart;

  const supabase = await createClient();
  const manage = canManageTips(profile.role);

  const [summary, eligibleUsersRes] = await Promise.all([
    getWeeklyTipSummary(supabase, profile.outlet_id, weekStart),
    manage
      ? supabase.from("users").select("id, name").eq("outlet_id", profile.outlet_id).eq("is_active", true).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div>
        <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Trinkgeld</h1>
        <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
          Kueche erhaelt {Math.round(0.4 * 100)}% als Pool, der Rest wird gleichmaessig auf die Belegschaft des jeweiligen
          Tages aufgeteilt.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <Link
            href={`/tips?week=${prevWeek}`}
            aria-label="Vorherige Woche"
            className="p-2 rounded-md text-parchment-dim hover:text-parchment hover:bg-ink-card"
          >
            <ChevronLeft size={16} />
          </Link>
          <h2 className="font-serif text-lg text-parchment">
            Woche {formatDe(weekStart)} – {formatDe(weekEnd)}
          </h2>
          <Link
            href={`/tips?week=${nextWeek}`}
            aria-label="Naechste Woche"
            className="p-2 rounded-md text-parchment-dim hover:text-parchment hover:bg-ink-card"
          >
            <ChevronRight size={16} />
          </Link>
        </div>

        {summary.totalAmount === 0 ? (
          <p className="text-sm text-parchment-dim">Fuer diese Woche wurde noch kein Trinkgeld erfasst.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-parchment-dim mb-3">
              <span>
                Gesamt: <span className="text-parchment tabular">{summary.totalAmount.toFixed(2)} €</span>
              </span>
              <span>
                Kueche: <span className="text-parchment tabular">{summary.kitchenTotal.toFixed(2)} €</span>
              </span>
            </div>

            <ul className="divide-y divide-ink-border">
              {summary.staffTotals.map((s) => (
                <li key={s.userId} className="flex items-center justify-between py-2">
                  <span className="text-sm text-parchment">{s.name}</span>
                  <span className="tabular text-sm text-parchment">{s.amount.toFixed(2)} €</span>
                </li>
              ))}
            </ul>

            <Disclosure label="Tage anzeigen" closeLabel="Tage ausblenden" className="mt-3">
              <ul className="space-y-2">
                {summary.days.map((d) => (
                  <li key={d.id} className="text-xs text-parchment-dim">
                    <span className="text-parchment">{formatDe(d.tip_date)}</span> · {d.total_amount.toFixed(2)} € gesamt ·
                    Kueche {d.kitchen_share.toFixed(2)} € · {d.workers.map((w) => w.name).join(", ") || "—"}
                  </li>
                ))}
              </ul>
            </Disclosure>
          </>
        )}
      </Card>

      {manage && (
        <TipDayManager days={summary.days} eligibleUsers={eligibleUsersRes.data ?? []} defaultDate={defaultEntryDate} />
      )}
    </div>
  );
}
