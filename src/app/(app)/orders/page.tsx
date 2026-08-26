import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { NewOrderItemForm } from "./NewOrderItemForm";
import { OrderList } from "./OrderList";

export default async function OrdersPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet. Bitte an einen Owner wenden.</Card>;
  }

  const [{ data: items }, { data: suppliers }] = await Promise.all([
    supabase
      .from("order_list_items")
      .select("id, item_name, quantity, supplier_name, notes, status, created_at")
      .eq("outlet_id", profile.outlet_id)
      .order("created_at", { ascending: false }),
    supabase.from("suppliers").select("name").order("name"),
  ]);

  const supplierNames = (suppliers ?? []).map((s) => s.name);

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div>
        <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Bestellungen</h1>
        <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
          Was fehlt, wie viel, und von wo es kommt.
        </p>
      </div>

      <Card>
        <NewOrderItemForm supplierNames={supplierNames} />
      </Card>

      <OrderList items={items ?? []} />
    </div>
  );
}
