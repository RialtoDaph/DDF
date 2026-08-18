import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CreateTemplateButton } from "@/app/(app)/checklists/shared/CreateTemplateButton";
import { TemplateEditor } from "./TemplateEditor";
import type { ChecklistTemplateItem } from "@/lib/database.types";

export default async function ChecklistSettingsPage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) redirect("/dashboard");
  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet.</Card>;
  }

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("id, name, items")
    .eq("outlet_id", profile.outlet_id);

  const opening = templates?.find((t) => t.name === "opening");
  const closing = templates?.find((t) => t.name === "closing");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">Checklisten-Vorlagen</h1>
        <p className="text-sm text-parchment-dim mt-1">Punkte für Opening und Closing anpassen.</p>
      </div>

      {opening ? (
        <TemplateEditor templateId={opening.id} title="Opening" items={(opening.items as ChecklistTemplateItem[]) ?? []} />
      ) : (
        <Card>
          <p className="text-sm text-parchment-dim mb-3">Noch keine Opening-Vorlage vorhanden.</p>
          <CreateTemplateButton type="opening" />
        </Card>
      )}

      {closing ? (
        <TemplateEditor templateId={closing.id} title="Closing (inkl. Round Check)" items={(closing.items as ChecklistTemplateItem[]) ?? []} />
      ) : (
        <Card>
          <p className="text-sm text-parchment-dim mb-3">Noch keine Closing-Vorlage vorhanden.</p>
          <CreateTemplateButton type="closing" />
        </Card>
      )}
    </div>
  );
}
