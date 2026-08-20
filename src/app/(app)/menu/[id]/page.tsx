import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { DetailShell } from "@/components/ui/DetailShell";
import { EditMenuItemForm } from "./EditMenuItemForm";
import { AddIngredientForm } from "./AddIngredientForm";
import { IngredientRow } from "./IngredientRow";
import { IngredientsCard } from "./IngredientsCard";
import { recipeLineCost, recipeDisplayUnit } from "@/lib/recipeCost";

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
    return {
      recipeId: r.id,
      amount: r.amount,
      name: item?.name ?? "—",
      unit: recipeDisplayUnit(item),
      lineCost: recipeLineCost(r.amount, item),
    };
  });

  const totalCost = ingredients.reduce((sum, i) => sum + i.lineCost, 0);
  const margin = menuItem.sale_price - totalCost;
  const marginPct = menuItem.sale_price > 0 ? (margin / menuItem.sale_price) * 100 : 0;

  return (
    <>
      <Link href="/menu" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zu Menü &amp; Rezepte
      </Link>

      <div className="mt-[var(--sp-md)]">
        <DetailShell
          title={menuItem.name}
          subtitle={`VK ${menuItem.sale_price.toFixed(2)} € · Kosten ${totalCost.toFixed(2)} € · Marge ${margin.toFixed(2)} € (${marginPct.toFixed(0)}%)`}
          canManage={canManage}
          editForm={
            <Card>
              <CardHeader title="Stammdaten" />
              <EditMenuItemForm item={menuItem} />
            </Card>
          }
        >
          <div className="mt-[var(--sp-lg)]">
            <IngredientsCard
              canManage={canManage}
              list={
                ingredients.length === 0 ? (
                  <p className="text-sm text-parchment-dim">Noch keine Zutaten hinterlegt.</p>
                ) : (
                  <ul className="divide-y divide-ink-border">
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
                )
              }
              addForm={<AddIngredientForm menuItemId={menuItem.id} items={items ?? []} />}
            />
          </div>
        </DetailShell>
      </div>
    </>
  );
}
