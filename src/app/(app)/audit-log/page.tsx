import { redirect } from "next/navigation";
import { requireProfile, canSeeAuditLog } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { formatTimestamp } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  stock_adjustment: "Bestandskorrektur",
  checklist_approved: "Checkliste freigegeben",
  user_updated: "Benutzer geändert",
  inventory_item_delete: "Artikel gelöscht",
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
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">Audit-Log</h1>
        <p className="text-sm text-parchment-dim mt-1">
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
