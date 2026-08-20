import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { StampBadge } from "@/components/ui/StampBadge";
import { Disclosure } from "@/components/ui/Disclosure";
import { CsvExportButton } from "@/components/reports/CsvExportButton";
import { CHECKLIST_LABEL, periodLabel } from "@/app/(app)/checklists/shared/lib";
import { formatDate } from "@/lib/utils";
import { recipeLineCost } from "@/lib/recipeCost";
import type { ChecklistType } from "@/lib/database.types";

export default async function ReportsPage() {
  const profile = await requireProfile();
  if (profile.role === "staff") redirect("/dashboard");

  const supabase = await createClient();
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: items }, { data: expiring }, { data: menuItems }, { data: recipeRows }, { data: tasks }, { data: closings }] =
    await Promise.all([
      supabase.from("inventory_items").select("id, name, category, unit, current_stock, par_level, purchase_price").order("category"),
      supabase
        .from("stock_movements")
        .select("id, expiry_date, quantity, inventory_items(name, unit)")
        .not("expiry_date", "is", null)
        .lte("expiry_date", in30Days)
        .order("expiry_date", { ascending: true })
        .limit(50),
      supabase.from("menu_items").select("id, name, sale_price").order("name"),
      supabase.from("recipes").select("menu_item_id, amount, inventory_items(unit_volume_ml, purchase_price)"),
      supabase.from("tasks").select("assigned_to, status, users!tasks_assigned_to_fkey(name)"),
      supabase
        .from("checklist_submissions")
        .select("id, period_start, status, users!checklist_submissions_user_id_fkey(name), checklist_templates!inner(name)")
        .in("status", ["submitted", "approved"])
        .order("period_start", { ascending: false })
        .limit(60),
    ]);

  const costByMenuItem = new Map<string, number>();
  for (const r of recipeRows ?? []) {
    const item = r.inventory_items as unknown as { unit_volume_ml: number | null; purchase_price: number | null } | null;
    costByMenuItem.set(r.menu_item_id, (costByMenuItem.get(r.menu_item_id) ?? 0) + recipeLineCost(r.amount, item));
  }

  const taskByEmployee = new Map<string, { name: string; done: number; total: number }>();
  for (const t of tasks ?? []) {
    if (!t.assigned_to) continue;
    const name = (t.users as unknown as { name: string } | null)?.name ?? "—";
    const entry = taskByEmployee.get(t.assigned_to) ?? { name, done: 0, total: 0 };
    entry.total += 1;
    if (t.status === "done") entry.done += 1;
    taskByEmployee.set(t.assigned_to, entry);
  }

  const today10 = today.toISOString().slice(0, 10);

  const stockValue = (items ?? []).reduce((sum, i) => sum + i.current_stock * (i.purchase_price ?? 0), 0);

  const marginsWithPrice = (menuItems ?? [])
    .filter((m) => m.sale_price > 0)
    .map((m) => ((m.sale_price - (costByMenuItem.get(m.id) ?? 0)) / m.sale_price) * 100);
  const avgMarginPct = marginsWithPrice.length > 0 ? marginsWithPrice.reduce((a, b) => a + b, 0) / marginsWithPrice.length : 0;

  const taskEntries = [...taskByEmployee.values()];
  const totalTasksDone = taskEntries.reduce((sum, e) => sum + e.done, 0);
  const totalTasks = taskEntries.reduce((sum, e) => sum + e.total, 0);
  const taskCompletionPct = totalTasks > 0 ? (totalTasksDone / totalTasks) * 100 : 0;

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div>
        <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Berichte</h1>
        <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
          Bestand, Kosten, Aufgaben und Checklisten-Verlauf.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--sp-md)]">
        <Card className="flex flex-col gap-2.5">
          <Link href="/inventory" className="group">
            <h3 className="font-serif font-semibold text-[length:var(--fs-h2)] text-parchment group-hover:text-wine transition-colors">
              Bestandsbericht
            </h3>
            <p className="text-xs text-parchment-dim mt-1">Aktueller Lagerwert</p>
            <p className="tabular text-[26px] text-parchment mt-2.5">
              {stockValue.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </p>
          </Link>
          <CsvExportButton
            filename="bestandsuebersicht.csv"
            headers={["Artikel", "Kategorie", "Bestand", "Einheit", "Soll"]}
            rows={(items ?? []).map((i) => [i.name, i.category, i.current_stock, i.unit, i.par_level])}
          />
        </Card>

        <Card className="flex flex-col gap-2.5">
          <div>
            <h3 className="font-serif font-semibold text-[length:var(--fs-h2)] text-parchment">Ablauf-Tracker</h3>
            <p className="text-xs text-parchment-dim mt-1">Ablaufdatum in den nächsten 30 Tagen</p>
          </div>
          <p className="tabular text-[26px] text-parchment">{expiring?.length ?? 0}</p>
          <CsvExportButton
            filename="ablauf-tracker.csv"
            headers={["Artikel", "Menge", "Einheit", "Ablaufdatum"]}
            rows={(expiring ?? []).map((e) => {
              const item = e.inventory_items as unknown as { name: string; unit: string } | null;
              return [item?.name ?? "—", e.quantity, item?.unit ?? "", e.expiry_date!];
            })}
          />
          {expiring && expiring.length > 0 && (
            <Disclosure label="Details anzeigen" closeLabel="Ausblenden">
              <ul className="divide-y divide-ink-border">
                {expiring.map((e) => {
                  const item = e.inventory_items as unknown as { name: string; unit: string } | null;
                  const expired = e.expiry_date! < today10;
                  return (
                    <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-parchment">
                        {item?.name} <span className="text-parchment-dim">— {e.quantity} {item?.unit}</span>
                      </span>
                      <span className={`tabular text-xs ${expired ? "text-warn" : "text-parchment-dim"}`}>
                        {formatDate(e.expiry_date!)}
                        {expired ? " (abgelaufen)" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Disclosure>
          )}
        </Card>

        <Card className="flex flex-col gap-2.5">
          <Link href="/menu" className="group">
            <h3 className="font-serif font-semibold text-[length:var(--fs-h2)] text-parchment group-hover:text-wine transition-colors">
              Kosten &amp; Marge
            </h3>
            <p className="text-xs text-parchment-dim mt-1">Durchschnittliche Marge, Menü</p>
            <p className="tabular text-[26px] text-parchment mt-2.5">{avgMarginPct.toFixed(0)} %</p>
          </Link>
          <CsvExportButton
            filename="kosten-marge.csv"
            headers={["Menüpunkt", "Verkaufspreis", "Kosten", "Marge"]}
            rows={(menuItems ?? []).map((m) => {
              const cost = costByMenuItem.get(m.id) ?? 0;
              return [m.name, m.sale_price.toFixed(2), cost.toFixed(2), (m.sale_price - cost).toFixed(2)];
            })}
          />
        </Card>

        <Card className="flex flex-col gap-2.5">
          <div>
            <h3 className="font-serif font-semibold text-[length:var(--fs-h2)] text-parchment">Aufgaben-Erledigung</h3>
            <p className="text-xs text-parchment-dim mt-1">Pro Mitarbeiter, gesamt</p>
          </div>
          <p className="tabular text-[26px] text-parchment">{taskCompletionPct.toFixed(0)} %</p>
          <CsvExportButton
            filename="aufgabenerledigung.csv"
            headers={["Mitarbeiter", "Erledigt", "Gesamt", "Quote"]}
            rows={taskEntries.map((e) => [e.name, e.done, e.total, `${e.total > 0 ? Math.round((e.done / e.total) * 100) : 0}%`])}
          />
          {taskEntries.length > 0 && (
            <Disclosure label="Details anzeigen" closeLabel="Ausblenden">
              <ul className="divide-y divide-ink-border">
                {taskEntries.map((e) => (
                  <li key={e.name} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-parchment">{e.name}</span>
                    <span className="tabular text-xs text-parchment-dim">
                      {e.done}/{e.total} erledigt ({e.total > 0 ? Math.round((e.done / e.total) * 100) : 0}%)
                    </span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Checklisten-Verlauf" subtitle="Eingereichte und freigegebene Berichte inkl. Fotos" />
        {!closings || closings.length === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine Checklisten eingereicht.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {closings.map((c) => {
              const type = (c.checklist_templates as unknown as { name: ChecklistType } | null)?.name;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/reports/checkliste/${c.id}`} className="min-w-0 text-parchment hover:text-wine">
                    <span className="text-wine">{type ? CHECKLIST_LABEL[type] : "Checkliste"}</span>
                    {" · "}
                    {type ? periodLabel(type, c.period_start) : c.period_start}
                    {" — "}
                    {(c.users as unknown as { name: string } | null)?.name}
                  </Link>
                  {c.status === "approved" ? (
                    <StampBadge>Freigegeben</StampBadge>
                  ) : (
                    <StampBadge variant="warn">Eingereicht</StampBadge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
