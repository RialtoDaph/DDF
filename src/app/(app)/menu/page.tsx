import Link from "next/link";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export default async function MenuPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: menuItems }, { data: recipeRows }] = await Promise.all([
    supabase.from("menu_items").select("id, name, sale_price").order("name"),
    supabase.from("recipes").select("menu_item_id, amount, inventory_items(purchase_price)"),
  ]);

  const costByMenuItem = new Map<string, number>();
  for (const r of recipeRows ?? []) {
    const price = (r.inventory_items as unknown as { purchase_price: number | null } | null)?.purchase_price ?? 0;
    const current = costByMenuItem.get(r.menu_item_id) ?? 0;
    costByMenuItem.set(r.menu_item_id, current + r.amount * price);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-parchment">Menü &amp; Rezepte</h1>
          <p className="text-sm text-parchment-dim mt-1">Zutatenkosten und Marge je Menüpunkt.</p>
        </div>
        {canManageMasterData(profile.role) && <LinkButton href="/menu/new">Neuer Menüpunkt</LinkButton>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(menuItems ?? []).map((m) => {
          const cost = costByMenuItem.get(m.id) ?? 0;
          const margin = m.sale_price - cost;
          const marginPct = m.sale_price > 0 ? (margin / m.sale_price) * 100 : 0;
          return (
            <Link key={m.id} href={`/menu/${m.id}`}>
              <Card className="hover:border-wine/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-parchment">{m.name}</span>
                  <span className="tabular text-sm text-parchment-dim">{m.sale_price.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-parchment-dim">Kosten: {cost.toFixed(2)} €</span>
                  <span className={margin >= 0 ? "text-done" : "text-warn"}>
                    Marge: {margin.toFixed(2)} € ({marginPct.toFixed(0)}%)
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
        {(!menuItems || menuItems.length === 0) && (
          <p className="text-sm text-parchment-dim col-span-full">Noch keine Menüpunkte angelegt.</p>
        )}
      </div>
    </div>
  );
}
