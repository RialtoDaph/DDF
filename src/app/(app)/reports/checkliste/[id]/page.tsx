import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile, canApprove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrl, CHECKLIST_LABEL, periodLabel } from "@/app/(app)/checklists/shared/lib";
import { ApproveButton } from "@/app/(app)/checklists/shared/ApproveButton";
import type { ChecklistType } from "@/lib/database.types";
import { Card, CardHeader } from "@/components/ui/Card";
import { StampBadge } from "@/components/ui/StampBadge";
import { formatDate } from "@/lib/utils";

export default async function ClosingReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (profile.role === "staff") redirect("/dashboard");

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select(
      "id, date, period_start, shift, cash_count, incident_notes, status, submitted_at, user_id, users!checklist_submissions_user_id_fkey(name), checklist_templates(name)",
    )
    .eq("id", id)
    .single();

  if (!submission) notFound();

  const type = (submission.checklist_templates as unknown as { name: ChecklistType } | null)?.name;
  const heading = type
    ? `${CHECKLIST_LABEL[type]} · ${periodLabel(type, submission.period_start)}`
    : `Checkliste · ${formatDate(submission.date)}`;
  const submittedTime = submission.submitted_at
    ? new Date(submission.submitted_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : null;

  const { data: results } = await supabase
    .from("checklist_item_results")
    .select("id, item_text, checked, photo_url, photo_taken_at")
    .eq("submission_id", id);

  const withUrls = await Promise.all(
    (results ?? []).map(async (r) => ({
      ...r,
      signedUrl: r.photo_url ? await signedPhotoUrl(supabase, r.photo_url) : null,
    })),
  );
  const photos = withUrls.filter((r) => r.signedUrl);

  return (
    <div className="space-y-[var(--sp-lg)]">
      <Link href="/reports" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zu Berichten
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">{heading}</h1>
          <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
            Eingereicht von {(submission.users as unknown as { name: string } | null)?.name}
            {submittedTime ? ` · ${submittedTime}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {submission.status === "approved" && <StampBadge>Freigegeben</StampBadge>}
          {submission.status === "submitted" && (
            <>
              <StampBadge variant="warn">Eingereicht</StampBadge>
              {canApprove(profile.role) && type && submission.user_id !== profile.id && (
                <ApproveButton submissionId={submission.id} type={type} />
              )}
            </>
          )}
        </div>
      </div>

      {(submission.cash_count !== null || submission.incident_notes) && (
        <Card>
          <CardHeader title="Kassenabschluss" />
          {submission.cash_count !== null && (
            <p className="text-sm text-parchment">Kassenbestand: {submission.cash_count.toFixed(2)} €</p>
          )}
          {submission.incident_notes && (
            <p className="text-sm text-parchment-dim mt-2 whitespace-pre-wrap">{submission.incident_notes}</p>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title={type === "closing" ? "Checkliste & Round Check" : "Checkliste"} />
        <ul className="divide-y divide-ink-border">
          {withUrls.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-parchment">{r.item_text}</span>
              {r.checked ? <StampBadge>Erledigt</StampBadge> : <StampBadge variant="warn">Offen</StampBadge>}
            </li>
          ))}
          {withUrls.length === 0 && <p className="text-sm text-parchment-dim py-2">Keine Einträge.</p>}
        </ul>
      </Card>

      {photos.length > 0 && (
        <Card>
          <CardHeader title="Foto-Nachweise" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((r) => (
              <div key={r.id} className="space-y-1.5">
                <div className="aspect-square rounded-lg overflow-hidden border border-ink-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.signedUrl!} alt={r.item_text} className="w-full h-full object-cover" />
                </div>
                <p className="text-[11px] text-parchment-dim truncate">{r.item_text}</p>
                {r.photo_taken_at && (
                  <p className="tabular text-[10px] text-parchment-dim/70">
                    {new Date(r.photo_taken_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
