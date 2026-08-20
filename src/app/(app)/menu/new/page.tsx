import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { NewMenuItemForm } from "./NewMenuItemForm";

export default async function NewMenuItemPage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    redirect("/menu");
  }

  return (
    <div className="max-w-lg space-y-[var(--sp-lg)]">
      <Link href="/menu" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zu Menü &amp; Rezepte
      </Link>
      <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Neuer Menüpunkt</h1>
      <Card>
        <NewMenuItemForm />
      </Card>
    </div>
  );
}
