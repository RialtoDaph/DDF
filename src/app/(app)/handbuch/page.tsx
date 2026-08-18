import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { HandbookBrowser } from "./HandbookBrowser";
import { NewSectionForm } from "./NewSectionForm";

export default async function HandbuchPage() {
  const profile = await requireProfile();
  const canEdit = canManageMasterData(profile.role);

  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet. Bitte an einen Owner wenden.</Card>;
  }

  const supabase = await createClient();
  const { data: sections } = await supabase
    .from("handbook_sections")
    .select("id, category, title, body, sort_order")
    .eq("outlet_id", profile.outlet_id)
    .order("category")
    .order("sort_order");

  const categories = [...new Set((sections ?? []).map((s) => s.category))].sort((a, b) =>
    a.localeCompare(b, "de"),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">Handbuch</h1>
        <p className="text-sm text-parchment-dim mt-1">
          Nachschlagen waehrend der Schicht — Ablaeufe, Hausregeln, Geraete.
        </p>
      </div>

      <HandbookBrowser sections={sections ?? []} canEdit={canEdit} />

      {canEdit && <NewSectionForm categories={categories} />}
    </div>
  );
}
