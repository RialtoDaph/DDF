import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrl, CHECKLIST_LABEL, periodLabel } from "@/app/(app)/checklists/shared/lib";
import type { ChecklistType } from "@/lib/database.types";
import { Card, CardHeader } from "@/components/ui/Card";
import { StampBadge } from "@/components/ui/StampBadge";
import { formatDate, formatTimestamp } from "@/lib/utils";

export default async function ClosingReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (profile.role === "staff") redirect("/dashboard");

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("checklist_submissions")
    .select(
      "id, date, period_start, shift, cash_count, incident_notes, status, users(name), checklist_templates(name)",
    )
    .eq("id", id)
    .single();

  if (!submission) notFound();

  const type = (submission.checklist_templates as unknown as { name: ChecklistType } | null)?.name;
  const heading = type
    ? `${CHECKLIST_LABEL[type]} — ${periodLabel(type, submission.period_start)}`
    : `Checkliste — ${formatDate(submission.date)}`;

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-parchment">{heading}</h1>
          <p className="text-sm text-parchment-dim mt-1">
            {(submission.users as unknown as { name: string } | null)?.name}
            {submission.shift ? ` · ${submission.shift}` : ""}
          </p>
        </div>
        {submission.status === "approved" ? <StampBadge>Freigegeben</StampBadge> : <StampBadge variant="warn">Eingereicht</StampBadge>}
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
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-parchment">{r.item_text}</span>
                {r.checked ? <StampBadge>Erledigt</StampBadge> : <StampBadge variant="warn">Offen</StampBadge>}
              </div>
              {r.signedUrl && (
                <div className="mt-2 max-w-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.signedUrl} alt={r.item_text} className="rounded-md border border-ink-border" />
                  {r.photo_taken_at && (
                    <p className="tabular text-xs text-parchment-dim mt-1">{formatTimestamp(r.photo_taken_at)}</p>
                  )}
                </div>
              )}
            </li>
          ))}
          {withUrls.length === 0 && <p className="text-sm text-parchment-dim py-2">Keine Einträge.</p>}
        </ul>
      </Card>
    </div>
  );
}
