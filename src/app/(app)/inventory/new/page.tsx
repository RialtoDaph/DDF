import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { NewItemForm } from "./NewItemForm";
import { Card } from "@/components/ui/Card";

export default async function NewInventoryItemPage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    redirect("/inventory");
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif text-2xl text-parchment">Neuer Artikel</h1>
      <Card>
        <NewItemForm />
      </Card>
    </div>
  );
}
