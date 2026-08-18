import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { StampBadge } from "@/components/ui/StampBadge";
import { CsvExportButton } from "@/components/reports/CsvExportButton";
import { formatDate } from "@/lib/utils";

export default async function ReportsPage() {
  const profile = await requireProfile();
  if (profile.role === "staff") redirect("/dashboard");

  const supabase = await createClient();
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: items }, { data: expiring }, { data: menuItems }, { data: recipeRows }, { data: tasks }, { data: closings }] =
    await Promise.all([
      supabase.from("inventory_items").select("id, name, category, unit, current_stock, par_level").order("category"),
      supabase
        .from("stock_movements")
        .select("id, expiry_date, quantity, inventory_items(name, unit)")
        .not("expiry_date", "is", null)
        .lte("expiry_date", in30Days)
        .order("expiry_date", { ascending: true })
        .limit(50),
      supabase.from("menu_items").select("id, name, sale_price").order("name"),
      supabase.from("recipes").select("menu_item_id, amount, inventory_items(purchase_price)"),
      supabase.from("tasks").select("assigned_to, status, users(name)"),
      supabase
        .from("checklist_submissions")
        .select("id, date, status, users(name), checklist_templates!inner(name)")
        .eq("checklist_templates.name", "closing")
        .in("status", ["submitted", "approved"])
        .order("date", { ascending: false })
        .limit(30),
    ]);

  const costByMenuItem = new Map<string, number>();
  for (const r of recipeRows ?? []) {
    const price = (r.inventory_items as unknown as { purchase_price: number | null } | null)?.purchase_price ?? 0;
    costByMenuItem.set(r.menu_item_id, (costByMenuItem.get(r.menu_item_id) ?? 0) + r.amount * price);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">Berichte</h1>
        <p className="text-sm text-parchment-dim mt-1">Bestand, Ablauf, Kosten/Marge, Aufgaben, Closing-Verlauf.</p>
      </div>

      <Card>
        <CardHeader
          title="Bestandsübersicht"
          right={
            <CsvExportButton
              filename="bestandsuebersicht.csv"
              headers={["Artikel", "Kategorie", "Bestand", "Einheit", "Soll"]}
              rows={(items ?? []).map((i) => [i.name, i.category, i.current_stock, i.unit, i.par_level])}
            />
          }
        />
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(items ?? []).map((i) => (
            <div key={i.id} className="flex items-center gap-4">
              <span className="text-sm text-parchment w-40 truncate">{i.name}</span>
              <GaugeBar current={i.current_stock} par={i.par_level} unit={i.unit} className="flex-1" />
            </div>
          ))}
          {(!items || items.length === 0) && <p className="text-sm text-parchment-dim">Keine Artikel.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Ablauf-Tracker" subtitle="Ablaufdatum in den nächsten 30 Tagen" />
        {!expiring || expiring.length === 0 ? (
          <p className="text-sm text-parchment-dim">Nichts läuft in den nächsten 30 Tagen ab.</p>
        ) : (
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
        )}
      </Card>

      <Card>
        <CardHeader
          title="Kosten &amp; Marge"
          right={
            <CsvExportButton
              filename="kosten-marge.csv"
              headers={["Menüpunkt", "Verkaufspreis", "Kosten", "Marge"]}
              rows={(menuItems ?? []).map((m) => {
                const cost = costByMenuItem.get(m.id) ?? 0;
                return [m.name, m.sale_price.toFixed(2), cost.toFixed(2), (m.sale_price - cost).toFixed(2)];
              })}
            />
          }
        />
        {!menuItems || menuItems.length === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine Menüpunkte.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {menuItems.map((m) => {
              const cost = costByMenuItem.get(m.id) ?? 0;
              const margin = m.sale_price - cost;
              return (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/menu/${m.id}`} className="text-parchment hover:text-brass">
                    {m.name}
                  </Link>
                  <span className={`tabular text-xs ${margin >= 0 ? "text-done" : "text-warn"}`}>
                    {m.sale_price.toFixed(2)} € − {cost.toFixed(2)} € = {margin.toFixed(2)} €
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Aufgabenerledigung pro Mitarbeiter"
          right={
            <CsvExportButton
              filename="aufgabenerledigung.csv"
              headers={["Mitarbeiter", "Erledigt", "Gesamt", "Quote"]}
              rows={[...taskByEmployee.values()].map((e) => [
                e.name,
                e.done,
                e.total,
                `${e.total > 0 ? Math.round((e.done / e.total) * 100) : 0}%`,
              ])}
            />
          }
        />
        {taskByEmployee.size === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine Aufgaben zugewiesen.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {[...taskByEmployee.values()].map((e) => (
              <li key={e.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-parchment">{e.name}</span>
                <span className="tabular text-xs text-parchment-dim">
                  {e.done}/{e.total} erledigt ({e.total > 0 ? Math.round((e.done / e.total) * 100) : 0}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Closing-Verlauf" subtitle="Inkl. Fotos aus dem Round Check" />
        {!closings || closings.length === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine Closing-Berichte eingereicht.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {closings.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/reports/closing/${c.id}`} className="text-parchment hover:text-brass">
                  {formatDate(c.date)} — {(c.users as unknown as { name: string } | null)?.name}
                </Link>
                {c.status === "approved" ? <StampBadge>Freigegeben</StampBadge> : <StampBadge variant="warn">Eingereicht</StampBadge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
