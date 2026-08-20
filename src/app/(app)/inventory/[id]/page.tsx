import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { MovementForm } from "./MovementForm";
import { EditItemForm } from "./EditItemForm";
import { DetailShell } from "./DetailShell";
import { formatTimestamp } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  spirits: "Spirituosen",
  beer: "Bier",
  wine: "Wein",
  mixer: "Mixer",
  garnish: "Garnitur",
  herbs_produce: "Frische Kräuter & Früchte",
  juice: "Saft",
  liqueur: "Likör",
  schnapps: "Schnaps",
  syrup: "Sirup",
  bitters: "Bitter",
  consumable: "Verbrauch",
};

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
    <>
      <Link href="/inventory" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zum Inventar
      </Link>

      <div className="mt-[var(--sp-md)]">
        <DetailShell
          title={item.name}
          subtitle={`${CATEGORY_LABEL[item.category] ?? item.category} · ${item.unit}${item.is_perishable ? " · verderblich" : ""}`}
          canManage={canManage}
          editForm={
            <Card>
              <CardHeader title="Stammdaten" subtitle="Nur für Owner und Manager" />
              <EditItemForm item={item} suppliers={suppliers ?? []} />
            </Card>
          }
        >
          <div className="space-y-[var(--sp-lg)] mt-[var(--sp-lg)]">
            <Card>
              <GaugeBar current={item.current_stock} par={item.par_level} unit={item.unit} unitVolumeMl={item.unit_volume_ml} />
            </Card>

            <Card>
              <CardHeader title="Neue Bewegung erfassen" />
              <MovementForm itemId={item.id} unit={item.unit} suppliers={suppliers ?? []} canAdjust={canManage} />
            </Card>

            <Card>
              <CardHeader title="Bestandsverlauf" />
              {!movements || movements.length === 0 ? (
                <p className="text-sm text-parchment-dim">Noch keine Bewegungen erfasst.</p>
              ) : (
                <ul className="divide-y divide-ink-border max-h-96 overflow-y-auto">
                  {movements.map((m) => (
                    <li key={m.id} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className={m.type === "in" ? "text-done" : "text-warn"}>
                          {m.type === "in" ? "+" : "−"}
                          {m.quantity} {item.unit} · {REASON_LABEL[m.reason]}
                        </span>
                        <span className="tabular text-xs text-parchment-dim whitespace-nowrap">{formatTimestamp(m.date)}</span>
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
        </DetailShell>
      </div>
    </>
  );
}
