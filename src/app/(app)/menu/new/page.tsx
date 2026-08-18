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
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif text-2xl text-parchment">Neuer Menüpunkt</h1>
      <Card>
        <NewMenuItemForm />
      </Card>
    </div>
  );
}
