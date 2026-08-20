import Link from "next/link";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { recipeLineCost } from "@/lib/recipeCost";

export default async function MenuPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: menuItems }, { data: recipeRows }] = await Promise.all([
    supabase.from("menu_items").select("id, name, sale_price").order("name"),
    supabase.from("recipes").select("menu_item_id, amount, inventory_items(unit_volume_ml, purchase_price)"),
  ]);

  const costByMenuItem = new Map<string, number>();
  for (const r of recipeRows ?? []) {
    const item = r.inventory_items as unknown as { unit_volume_ml: number | null; purchase_price: number | null } | null;
    const current = costByMenuItem.get(r.menu_item_id) ?? 0;
    costByMenuItem.set(r.menu_item_id, current + recipeLineCost(r.amount, item));
  }

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Menü &amp; Rezepte</h1>
          <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">Kosten- und Margenberechnung je Getränk.</p>
        </div>
        {canManageMasterData(profile.role) && <LinkButton href="/menu/new">+ Neues Getränk</LinkButton>}
      </div>

      <Card>
        {(!menuItems || menuItems.length === 0) && (
          <p className="text-sm text-parchment-dim">Noch keine Menüpunkte angelegt.</p>
        )}
        <ul className="divide-y divide-ink-border">
          {(menuItems ?? []).map((m) => {
            const cost = costByMenuItem.get(m.id) ?? 0;
            const margin = m.sale_price - cost;
            return (
              <li key={m.id}>
                <Link
                  href={`/menu/${m.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-1 -mx-1 rounded-md hover:bg-ink-raised transition-colors"
                >
                  <span className="text-[length:var(--fs-body)] text-parchment flex-1 min-w-32">{m.name}</span>
                  <span className="tabular text-xs text-parchment-dim">VK {m.sale_price.toFixed(2)} €</span>
                  <span className="tabular text-xs text-parchment-dim">Kosten {cost.toFixed(2)} €</span>
                  <span className={`tabular text-xs ${margin >= 0 ? "text-done" : "text-warn"}`}>
                    Marge {margin.toFixed(2)} €
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
