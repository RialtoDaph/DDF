import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, canManageMasterData, canApprove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  getOrCreateSubmission,
  signedPhotoUrl,
  isChecklistType,
  periodStartFor,
  periodLabel,
  CHECKLIST_TYPES,
  CHECKLIST_LABEL,
} from "../shared/lib";
import { ChecklistSections, type ItemResultMap } from "../shared/ChecklistSections";
import { SubmitBar } from "../shared/SubmitBar";
import { ApproveButton } from "../shared/ApproveButton";
import { CreateTemplateButton } from "../shared/CreateTemplateButton";
import { PendingApprovals } from "../shared/PendingApprovals";
import { ClosingMetaForm, HandoverNoteForm } from "../shared/ClosingExtras";
import { Card } from "@/components/ui/Card";
import { StampBadge } from "@/components/ui/StampBadge";
import type { ChecklistTemplateItem } from "@/lib/database.types";

export default async function ChecklistPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: rawType } = await params;
  if (!isChecklistType(rawType)) notFound();
  const type = rawType;

  const profile = await requireProfile();
  const label = CHECKLIST_LABEL[type];

  const header = (
    <div>
      <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Checklisten</h1>
      <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
        Fotopflichtige Punkte erfordern eine Live-Aufnahme.
      </p>
    </div>
  );

  const tabs = (
    <div className="flex gap-1 rounded-[9px] bg-ink-card p-1 w-fit overflow-x-auto">
      {CHECKLIST_TYPES.map((t) => (
        <Link
          key={t}
          href={`/checklists/${t}`}
          className={cn(
            "rounded-lg px-5 py-2 text-[length:var(--fs-body)] whitespace-nowrap transition-colors",
            t === type ? "bg-wine-deep text-parchment" : "text-parchment-dim hover:text-parchment",
          )}
        >
          {CHECKLIST_LABEL[t]}
        </Link>
      ))}
    </div>
  );

  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet. Bitte an einen Owner wenden.</Card>;
  }

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("outlet_id", profile.outlet_id)
    .eq("name", type)
    .order("created_at", { ascending: true })
    .limit(1);

  const template = templates?.[0];

  if (!template) {
    return (
      <div className="space-y-[var(--sp-lg)]">
        {header}
        {tabs}
        <Card>
          <p className="text-sm text-parchment-dim mb-3">
            Fuer diesen Standort ist noch keine {label}-Vorlage angelegt.
          </p>
          {canManageMasterData(profile.role) ? (
            <CreateTemplateButton type={type} />
          ) : (
            <p className="text-sm text-parchment-dim">Bitte einen Manager oder Owner kontaktieren.</p>
          )}
        </Card>
      </div>
    );
  }

  const periodStart = periodStartFor(type);
  const submission = await getOrCreateSubmission(supabase, template.id, profile.id, periodStart);

  const { data: results } = await supabase
    .from("checklist_item_results")
    .select("item_text, checked, checklist_item_photos(id, photo_url, taken_at)")
    .eq("submission_id", submission.id);

  const resultMap: ItemResultMap = {};
  for (const r of results ?? []) {
    const photoRows =
      (r.checklist_item_photos as unknown as { id: string; photo_url: string; taken_at: string }[]) ?? [];
    const photos = await Promise.all(
      photoRows.map(async (p) => ({
        id: p.id,
        url: (await signedPhotoUrl(supabase, p.photo_url)) ?? "",
        takenAt: p.taken_at,
      })),
    );
    resultMap[r.item_text] = { checked: r.checked, photos: photos.filter((p) => p.url) };
  }

  const items = template.items as ChecklistTemplateItem[];
  const allSatisfied = items
    .filter((i) => i.requires_photo)
    .every((i) => resultMap[i.text]?.checked && (resultMap[i.text]?.photos.length ?? 0) > 0);

  const readOnly = submission.status !== "draft";
  const isClosing = type === "closing";

  const statusBadge = (
    <div className="flex items-center gap-2 shrink-0">
      {submission.status === "approved" && <StampBadge>Freigegeben</StampBadge>}
      {submission.status === "submitted" && (
        <>
          <StampBadge>Eingereicht</StampBadge>
          {canApprove(profile.role) && <ApproveButton submissionId={submission.id} type={type} />}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-[var(--sp-lg)] pb-24">
      {header}
      {tabs}

      {isClosing && (
        <ClosingMetaForm
          submissionId={submission.id}
          cashCount={submission.cash_count}
          incidentNotes={submission.incident_notes}
          shift={submission.shift}
          readOnly={readOnly}
        />
      )}

      <ChecklistSections
        submissionId={submission.id}
        type={type}
        items={items}
        results={resultMap}
        readOnly={readOnly}
        includeRoundCheck={isClosing}
        title={`${label} Checkliste`}
        subtitle={periodLabel(type, submission.period_start)}
        right={statusBadge}
      />

      {isClosing && <HandoverNoteForm readOnly={readOnly} />}

      <SubmitBar
        submissionId={submission.id}
        type={type}
        status={submission.status}
        allSatisfied={allSatisfied}
      />

      {canApprove(profile.role) && <PendingApprovals templateId={template.id} type={type} />}
    </div>
  );
}
