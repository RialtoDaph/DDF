import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { NewModuleForm } from "./NewModuleForm";

export default async function NewTrainingModulePage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    redirect("/training");
  }

  const supabase = await createClient();
  const { data: menuItems } = await supabase.from("menu_items").select("id, name").order("name");

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif text-2xl text-parchment">Neues Trainingsmodul</h1>
      <Card>
        <NewModuleForm menuItems={menuItems ?? []} />
      </Card>
    </div>
  );
}
