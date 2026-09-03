import { redirect } from "next/navigation";
import { requireProfile, canSeeAuditLog } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { formatTimestamp } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  stock_adjustment: "Bestandskorrektur",
  checklist_approved: "Checkliste freigegeben",
  checklist_submitted: "Checkliste eingereicht",
  user_updated: "Benutzer geändert",
  inventory_item_create: "Artikel angelegt",
  inventory_item_update: "Artikel geändert",
  inventory_item_delete: "Artikel gelöscht",
  menu_item_create: "Menüpunkt angelegt",
  menu_item_update: "Menüpunkt geändert",
  recipe_ingredient_add: "Zutat zum Rezept hinzugefügt",
  recipe_ingredient_remove: "Zutat aus Rezept entfernt",
  supplier_create: "Lieferant angelegt",
  supplier_update: "Lieferant geändert",
  supplier_price_add: "Lieferantenpreis erfasst",
  chat_channel_create: "Chat-Kanal angelegt",
  chat_channel_delete: "Chat-Kanal gelöscht",
};

export default async function AuditLogPage() {
  const profile = await requireProfile();
  if (!canSeeAuditLog(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, action, related_table, timestamp, change_detail, users(name)")
    .order("timestamp", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div>
        <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Audit-Log</h1>
        <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
          {profile.role === "owner" ? "Alle Aktivitäten." : "Aktivitäten deines Standorts."}
        </p>
      </div>

      <Card>
        {!entries || entries.length === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine protokollierten Aktionen.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {entries.map((e) => (
              <li key={e.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-parchment">{ACTION_LABEL[e.action] ?? e.action}</span>
                  <span className="tabular text-xs text-parchment-dim">{formatTimestamp(e.timestamp)}</span>
                </div>
                <p className="text-xs text-parchment-dim mt-0.5">
                  {(e.users as unknown as { name: string } | null)?.name ?? "System"}
                  {e.related_table ? ` · ${e.related_table}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
