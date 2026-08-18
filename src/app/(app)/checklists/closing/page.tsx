import { requireProfile, canManageMasterData, canApprove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateSubmission, signedPhotoUrl } from "../shared/lib";
import { ChecklistSections, type ItemResultMap } from "../shared/ChecklistSections";
import { SubmitBar } from "../shared/SubmitBar";
import { CreateTemplateButton } from "../shared/CreateTemplateButton";
import { PendingApprovals } from "../shared/PendingApprovals";
import { ClosingMetaForm, HandoverNoteForm } from "../shared/ClosingExtras";
import { Card } from "@/components/ui/Card";
import type { ChecklistTemplateItem } from "@/lib/database.types";

export default async function ClosingChecklistPage() {
  const profile = await requireProfile();

  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet. Bitte an einen Owner wenden.</Card>;
  }

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("outlet_id", profile.outlet_id)
    .eq("name", "closing")
    .maybeSingle();

  if (!template) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl text-parchment">Closing-Checkliste</h1>
        <Card>
          <p className="text-sm text-parchment-dim mb-3">Fuer diesen Standort ist noch keine Vorlage angelegt.</p>
          {canManageMasterData(profile.role) ? (
            <CreateTemplateButton type="closing" />
          ) : (
            <p className="text-sm text-parchment-dim">Bitte einen Manager oder Owner kontaktieren.</p>
          )}
        </Card>
      </div>
    );
  }

  const submission = await getOrCreateSubmission(supabase, template.id, profile.id);
  const { data: results } = await supabase
    .from("checklist_item_results")
    .select("item_text, checked, photo_url, photo_taken_at")
    .eq("submission_id", submission.id);

  const resultMap: ItemResultMap = {};
  for (const r of results ?? []) {
    resultMap[r.item_text] = {
      checked: r.checked,
      photo_url: r.photo_url ? await signedPhotoUrl(supabase, r.photo_url) : null,
      photo_taken_at: r.photo_taken_at,
    };
  }

  const items = template.items as ChecklistTemplateItem[];
  const allSatisfied = items
    .filter((i) => i.requires_photo)
    .every((i) => resultMap[i.text]?.checked && resultMap[i.text]?.photo_url);

  const readOnly = submission.status !== "draft";

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">Closing-Checkliste</h1>
        <p className="text-sm text-parchment-dim mt-1">{new Date().toLocaleDateString("de-DE")}</p>
      </div>

      <ClosingMetaForm
        submissionId={submission.id}
        cashCount={submission.cash_count}
        incidentNotes={submission.incident_notes}
        shift={submission.shift}
        readOnly={readOnly}
      />

      <ChecklistSections
        submissionId={submission.id}
        items={items}
        results={resultMap}
        readOnly={readOnly}
        includeRoundCheck={true}
      />

      <HandoverNoteForm readOnly={readOnly} />

      <SubmitBar
        submissionId={submission.id}
        type="closing"
        status={submission.status}
        allSatisfied={allSatisfied}
        canApproveRole={canApprove(profile.role)}
      />

      {canApprove(profile.role) && <PendingApprovals templateId={template.id} type="closing" />}
    </div>
  );
}
