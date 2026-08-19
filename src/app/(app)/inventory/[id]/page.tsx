import { notFound } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { MovementForm } from "./MovementForm";
import { EditItemForm } from "./EditItemForm";
import { formatTimestamp } from "@/lib/utils";

const REASON_LABEL: Record<string, string> = {
  restock: "Wareneingang",
  usage: "Verbrauch",
  waste: "Schwund/Verderb",
  adjustment: "Korrektur",
};

export default async function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: item }, { data: suppliers }, { data: movements }] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("id", id).single(),
    supabase.from("suppliers").select("id, name").order("name"),
    supabase
      .from("stock_movements")
      .select("id, type, quantity, reason, date, notes, users(name)")
      .eq("item_id", id)
      .order("date", { ascending: false })
      .limit(25),
  ]);

  if (!item) notFound();

  const canManage = canManageMasterData(profile.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">{item.name}</h1>
        <p className="text-sm text-parchment-dim mt-1">
          {item.category} · {item.unit}
          {item.is_perishable ? " · verderblich" : ""}
        </p>
      </div>

      <Card>
        <GaugeBar current={item.current_stock} par={item.par_level} unit={item.unit} unitVolumeMl={item.unit_volume_ml} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Wareneingang / Warenausgang" />
          <MovementForm itemId={item.id} unit={item.unit} suppliers={suppliers ?? []} canAdjust={canManage} />
        </Card>

        <Card>
          <CardHeader title="Bestandsverlauf" />
          {!movements || movements.length === 0 ? (
            <p className="text-sm text-parchment-dim">Noch keine Bewegungen erfasst.</p>
          ) : (
            <ul className="divide-y divide-ink-border max-h-96 overflow-y-auto">
              {movements.map((m) => (
                <li key={m.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={m.type === "in" ? "text-done" : "text-warn"}>
                      {m.type === "in" ? "+" : "−"}
                      {m.quantity} {item.unit} · {REASON_LABEL[m.reason]}
                    </span>
                    <span className="tabular text-xs text-parchment-dim">{formatTimestamp(m.date)}</span>
                  </div>
                  <p className="text-xs text-parchment-dim mt-0.5">
                    {(m.users as unknown as { name: string } | null)?.name ?? "—"}
                    {m.notes ? ` · ${m.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {canManage && (
        <Card>
          <CardHeader title="Stammdaten" subtitle="Nur fuer Owner und Manager" />
          <EditItemForm item={item} />
        </Card>
      )}
    </div>
  );
}
