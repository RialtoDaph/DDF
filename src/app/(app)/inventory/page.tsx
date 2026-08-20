import Link from "next/link";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { LinkButton } from "@/components/ui/Button";
import { LinkChip } from "@/components/ui/Chip";
import type { ItemCategory } from "@/lib/database.types";

const CATEGORIES: { value: ItemCategory | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "spirits", label: "Spirituosen" },
  { value: "beer", label: "Bier" },
  { value: "wine", label: "Wein" },
  { value: "mixer", label: "Mixer" },
  { value: "garnish", label: "Garnitur" },
  { value: "herbs_produce", label: "Frische Kräuter & Früchte" },
  { value: "juice", label: "Saft" },
  { value: "liqueur", label: "Likör" },
  { value: "schnapps", label: "Schnaps" },
  { value: "syrup", label: "Sirup" },
  { value: "bitters", label: "Bitter" },
  { value: "consumable", label: "Verbrauch" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  let query = supabase
    .from("inventory_items")
    .select("id, name, category, unit, unit_volume_ml, current_stock, par_level")
    .order("name");

  if (category && category !== "all") {
    query = query.eq("category", category as ItemCategory);
  }

  const { data: items } = await query;

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Inventar</h1>
          <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">Bestand gegen Sollmenge, nach Kategorie.</p>
        </div>
        {canManageMasterData(profile.role) && (
          <LinkButton href="/inventory/new" className="whitespace-nowrap">
            + Neuer Artikel
          </LinkButton>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((c) => {
          const active = (category ?? "all") === c.value;
          return (
            <LinkChip
              key={c.value}
              href={c.value === "all" ? "/inventory" : `/inventory?category=${c.value}`}
              active={active}
            >
              {c.label}
            </LinkChip>
          );
        })}
      </div>

      <div className="grid grid-cols-1 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3 gap-[var(--sp-md)]">
        {(items ?? []).map((item) => (
          <Link key={item.id} href={`/inventory/${item.id}`}>
            <Card className="hover:border-wine/50 transition-colors">
              <div className="flex items-center justify-between mb-2.5 gap-2">
                <span className="text-[length:var(--fs-body)] text-parchment truncate">{item.name}</span>
                <span className="text-[9.5px] uppercase tracking-wide text-parchment-dim whitespace-nowrap">
                  {CATEGORIES.find((c) => c.value === item.category)?.label}
                </span>
              </div>
              <GaugeBar current={item.current_stock} par={item.par_level} unit={item.unit} unitVolumeMl={item.unit_volume_ml} />
            </Card>
          </Link>
        ))}
        {(!items || items.length === 0) && (
          <p className="text-sm text-parchment-dim col-span-full">Keine Artikel in dieser Kategorie.</p>
        )}
      </div>
    </div>
  );
}
