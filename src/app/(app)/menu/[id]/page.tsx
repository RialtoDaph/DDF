import { notFound } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { EditMenuItemForm } from "./EditMenuItemForm";
import { AddIngredientForm } from "./AddIngredientForm";
import { IngredientRow } from "./IngredientRow";

export default async function MenuItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: menuItem }, { data: recipes }, { data: items }] = await Promise.all([
    supabase.from("menu_items").select("*").eq("id", id).single(),
    supabase
      .from("recipes")
      .select("id, amount, inventory_items(id, name, unit, unit_volume_ml, purchase_price)")
      .eq("menu_item_id", id),
    supabase.from("inventory_items").select("id, name, unit, unit_volume_ml").order("name"),
  ]);

  if (!menuItem) notFound();
  const canManage = canManageMasterData(profile.role);

  const ingredients = (recipes ?? []).map((r) => {
    const item = r.inventory_items as unknown as {
      id: string;
      name: string;
      unit: string;
      unit_volume_ml: number | null;
      purchase_price: number | null;
    } | null;
    // purchase_price is what one stock unit costs (e.g. one bottle) — a
    // recipe's amount is in ml, so without unit_volume_ml (ml per bottle)
    // the naive amount * purchase_price treats the price as "per ml" and
    // massively overcounts. Derive a price-per-ml when it's set.
    const pricePerMl = item?.unit_volume_ml ? (item.purchase_price ?? 0) / item.unit_volume_ml : (item?.purchase_price ?? 0);
    const lineCost = r.amount * pricePerMl;
    return { recipeId: r.id, amount: r.amount, name: item?.name ?? "—", unit: item?.unit ?? "", lineCost };
  });

  const totalCost = ingredients.reduce((sum, i) => sum + i.lineCost, 0);
  const margin = menuItem.sale_price - totalCost;
  const marginPct = menuItem.sale_price > 0 ? (margin / menuItem.sale_price) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">{menuItem.name}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-parchment-dim">Verkaufspreis</p>
          <p className="tabular text-xl text-parchment mt-1">{menuItem.sale_price.toFixed(2)} €</p>
        </Card>
        <Card>
          <p className="text-xs text-parchment-dim">Zutatenkosten</p>
          <p className="tabular text-xl text-parchment mt-1">{totalCost.toFixed(2)} €</p>
        </Card>
        <Card>
          <p className="text-xs text-parchment-dim">Marge</p>
          <p className={`tabular text-xl mt-1 ${margin >= 0 ? "text-done" : "text-warn"}`}>
            {margin.toFixed(2)} € ({marginPct.toFixed(0)}%)
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Rezeptur" />
        {ingredients.length === 0 ? (
          <p className="text-sm text-parchment-dim">Noch keine Zutaten hinterlegt.</p>
        ) : (
          <ul className="divide-y divide-ink-border mb-4">
            {ingredients.map((i) => (
              <IngredientRow
                key={i.recipeId}
                recipeId={i.recipeId}
                menuItemId={menuItem.id}
                name={i.name}
                unit={i.unit}
                amount={i.amount}
                lineCost={i.lineCost}
                canManage={canManage}
              />
            ))}
          </ul>
        )}
        {canManage && <AddIngredientForm menuItemId={menuItem.id} items={items ?? []} />}
      </Card>

      {canManage && (
        <Card>
          <CardHeader title="Stammdaten" />
          <EditMenuItemForm item={menuItem} />
        </Card>
      )}
    </div>
  );
}
