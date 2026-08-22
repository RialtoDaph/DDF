import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { NewCabinetForm } from "./NewCabinetForm";
import { WineCabinets } from "./WineCabinets";
import type { CabinetData, WineItem } from "./lib";

export default async function WeinPage() {
  const profile = await requireProfile();
  const canManage = canManageMasterData(profile.role);

  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet. Bitte an einen Owner wenden.</Card>;
  }

  const supabase = await createClient();

  const [{ data: cabinetsRaw }, { data: wineItemsRaw }] = await Promise.all([
    supabase
      .from("wine_cabinets")
      .select(
        "id, name, temperature_c, sort_order, wine_slots(id, rack_number, slot_number, flipped, inventory_items(id, name, wine_type, current_stock, unit))",
      )
      .eq("outlet_id", profile.outlet_id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("inventory_items")
      .select("id, name, wine_type, current_stock, unit")
      .eq("outlet_id", profile.outlet_id)
      .eq("category", "wine")
      .order("name"),
  ]);

  const cabinets: CabinetData[] = (cabinetsRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    temperatureC: c.temperature_c,
    slots: (
      (c.wine_slots as unknown as {
        id: string;
        rack_number: number;
        slot_number: number;
        flipped: boolean;
        inventory_items: { id: string; name: string; wine_type: WineItem["wineType"]; current_stock: number; unit: string } | null;
      }[]) ?? []
    ).map((s) => ({
      id: s.id,
      rackNumber: s.rack_number,
      slotNumber: s.slot_number,
      flipped: s.flipped,
      item: s.inventory_items
        ? {
            id: s.inventory_items.id,
            name: s.inventory_items.name,
            wineType: s.inventory_items.wine_type,
            currentStock: s.inventory_items.current_stock,
            unit: s.inventory_items.unit,
          }
        : null,
    })),
  }));

  const wineItems: WineItem[] = (wineItemsRaw ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    wineType: w.wine_type,
    currentStock: w.current_stock,
    unit: w.unit,
  }));

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Weinschrank</h1>
          <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
            Was drin ist und wie voll, ohne die Tür zu öffnen.
          </p>
        </div>
        {canManage && <NewCabinetForm />}
      </div>

      <WineCabinets cabinets={cabinets} wineItems={wineItems} canManage={canManage} />
    </div>
  );
}
