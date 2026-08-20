import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewItemForm } from "./NewItemForm";
import { Card } from "@/components/ui/Card";

export default async function NewInventoryItemPage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    redirect("/inventory");
  }

  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");

  return (
    <div className="max-w-lg space-y-[var(--sp-lg)]">
      <Link href="/inventory" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zum Inventar
      </Link>
      <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Neuer Artikel</h1>
      <Card>
        <NewItemForm suppliers={suppliers ?? []} />
      </Card>
    </div>
  );
}
