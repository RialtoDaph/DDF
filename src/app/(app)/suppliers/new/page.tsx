import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { NewSupplierForm } from "./NewSupplierForm";

export default async function NewSupplierPage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    redirect("/suppliers");
  }

  return (
    <div className="max-w-lg space-y-[var(--sp-lg)]">
      <Link href="/suppliers" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zu Lieferanten
      </Link>
      <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Neuer Lieferant</h1>
      <Card>
        <NewSupplierForm />
      </Card>
    </div>
  );
}
