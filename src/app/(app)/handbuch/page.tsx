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
    <div className="space-y-[var(--sp-lg)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Handbuch</h1>
          <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
            Nachschlagen während der Schicht — Abläufe, Hausregeln, Geräte.
          </p>
        </div>
        {canEdit && (
          <div className="shrink-0">
            <NewSectionForm categories={categories} />
          </div>
        )}
      </div>

      <HandbookBrowser sections={sections ?? []} canEdit={canEdit} />
    </div>
  );
}
