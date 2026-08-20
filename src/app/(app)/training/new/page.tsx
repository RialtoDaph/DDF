import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { NewModuleForm } from "./NewModuleForm";

export default async function NewTrainingModulePage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) {
    redirect("/handbuch");
  }

  const supabase = await createClient();
  const { data: menuItems } = await supabase.from("menu_items").select("id, name").order("name");

  return (
    <div className="max-w-lg space-y-[var(--sp-lg)]">
      <Link href="/handbuch" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zu Handbuch &amp; Training
      </Link>
      <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Neues Trainingsmodul</h1>
      <Card>
        <NewModuleForm menuItems={menuItems ?? []} />
      </Card>
    </div>
  );
}
