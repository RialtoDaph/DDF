import { notFound } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { EditSupplierForm } from "./EditSupplierForm";
import { AddPriceForm } from "./AddPriceForm";
import { formatDate } from "@/lib/utils";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: supplier }, { data: priceHistory }, { data: items }] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).single(),
    supabase
      .from("supplier_price_history")
      .select("id, price, valid_from, inventory_items(name, unit)")
      .eq("supplier_id", id)
      .order("valid_from", { ascending: false }),
    supabase.from("inventory_items").select("id, name, unit").order("name"),
  ]);

  if (!supplier) notFound();
  const canManage = canManageMasterData(profile.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">{supplier.name}</h1>
        <p className="text-sm text-parchment-dim mt-1">
          {supplier.category ?? "—"}
          {supplier.contact ? ` · ${supplier.contact}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Preisverlauf" />
          {!priceHistory || priceHistory.length === 0 ? (
            <p className="text-sm text-parchment-dim">Noch keine Preise erfasst.</p>
          ) : (
            <ul className="divide-y divide-ink-border max-h-96 overflow-y-auto">
              {priceHistory.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-parchment">
                    {(p.inventory_items as unknown as { name: string; unit: string } | null)?.name}
                  </span>
                  <span className="tabular text-parchment-dim">
                    {p.price.toFixed(2)} € · {formatDate(p.valid_from)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            <div className="mt-4 pt-4 border-t border-ink-border">
              <AddPriceForm supplierId={supplier.id} items={items ?? []} />
            </div>
          )}
        </Card>

        {canManage && (
          <Card>
            <CardHeader title="Stammdaten" />
            <EditSupplierForm supplier={supplier} />
          </Card>
        )}
      </div>

      {supplier.notes && (
        <Card>
          <CardHeader title="Notizen" />
          <p className="text-sm text-parchment-dim whitespace-pre-wrap">{supplier.notes}</p>
        </Card>
      )}
    </div>
  );
}
