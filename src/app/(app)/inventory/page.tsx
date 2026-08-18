import Link from "next/link";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ItemCategory } from "@/lib/database.types";

const CATEGORIES: { value: ItemCategory | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "spirits", label: "Spirituosen" },
  { value: "beer", label: "Bier" },
  { value: "wine", label: "Wein" },
  { value: "mixer", label: "Mixer" },
  { value: "garnish", label: "Garnitur" },
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
    .select("id, name, category, unit, current_stock, par_level")
    .order("name");

  if (category && category !== "all") {
    query = query.eq("category", category as ItemCategory);
  }

  const { data: items } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-parchment">Inventar</h1>
          <p className="text-sm text-parchment-dim mt-1">Bestand gegen Sollmenge, nach Kategorie.</p>
        </div>
        {canManageMasterData(profile.role) && (
          <LinkButton href="/inventory/new" className="whitespace-nowrap">
            Neuer Artikel
          </LinkButton>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((c) => {
          const active = (category ?? "all") === c.value;
          return (
            <Link
              key={c.value}
              href={c.value === "all" ? "/inventory" : `/inventory?category=${c.value}`}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm border transition-colors",
                active
                  ? "bg-wine text-ink border-wine"
                  : "border-ink-border text-parchment-dim hover:text-parchment hover:border-wine/50",
              )}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(items ?? []).map((item) => (
          <Link key={item.id} href={`/inventory/${item.id}`}>
            <Card className="hover:border-wine/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-parchment">{item.name}</span>
                <span className="text-xs uppercase tracking-wide text-parchment-dim">
                  {CATEGORIES.find((c) => c.value === item.category)?.label}
                </span>
              </div>
              <GaugeBar current={item.current_stock} par={item.par_level} unit={item.unit} />
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
