import { redirect } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CreateTemplateButton } from "@/app/(app)/checklists/shared/CreateTemplateButton";
import { CHECKLIST_TYPES, CHECKLIST_LABEL } from "@/app/(app)/checklists/shared/lib";
import { TemplateEditor } from "./TemplateEditor";
import { EventsCard } from "../EventsCard";
import type { ChecklistTemplateItem } from "@/lib/database.types";

const SUBTITLE: Record<string, string> = {
  opening: "Opening",
  closing: "Closing (inkl. Round Check)",
  weekly: "Wochencheck",
  monthly: "Monatscheck",
};

export default async function ChecklistSettingsPage() {
  const profile = await requireProfile();
  if (!canManageMasterData(profile.role)) redirect("/dashboard");
  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet.</Card>;
  }

  const supabase = await createClient();
  const [{ data: templates }, { data: events }] = await Promise.all([
    supabase.from("checklist_templates").select("id, name, items").eq("outlet_id", profile.outlet_id),
    supabase
      .from("events")
      .select("id, label, event_date")
      .eq("outlet_id", profile.outlet_id)
      .order("event_date", { ascending: true }),
  ]);

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div>
        <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Einstellungen</h1>
        <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">Termine und Checklisten-Vorlagen verwalten.</p>
      </div>

      <EventsCard events={events ?? []} />

      <div>
        <h2 className="font-serif font-semibold text-[length:var(--fs-h2)] text-parchment">Checklisten-Vorlagen</h2>
        <p className="text-sm text-parchment-dim mt-1">Punkte für Opening, Closing, Wochen- und Monatscheck anpassen.</p>
      </div>

      {CHECKLIST_TYPES.map((type) => {
        const template = templates?.find((t) => t.name === type);

        return template ? (
          <TemplateEditor
            key={type}
            templateId={template.id}
            title={SUBTITLE[type] ?? CHECKLIST_LABEL[type]}
            items={(template.items as ChecklistTemplateItem[]) ?? []}
          />
        ) : (
          <Card key={type}>
            <p className="text-sm text-parchment-dim mb-3">
              Noch keine Vorlage fuer {CHECKLIST_LABEL[type]} vorhanden.
            </p>
            <CreateTemplateButton type={type} />
          </Card>
        );
      })}
    </div>
  );
}
