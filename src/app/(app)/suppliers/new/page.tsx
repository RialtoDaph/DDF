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
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif text-2xl text-parchment">Neuer Lieferant</h1>
      <Card>
        <NewSupplierForm />
      </Card>
    </div>
  );
}
