import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { ApproveButton } from "./ApproveButton";
import { formatTimestamp } from "@/lib/utils";
import type { ChecklistType } from "@/lib/database.types";

export async function PendingApprovals({ templateId, type }: { templateId: string; type: ChecklistType }) {
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("checklist_submissions")
    .select("id, submitted_at, users(name)")
    .eq("template_id", templateId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (!submissions || submissions.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Ausstehende Freigaben" />
      <ul className="divide-y divide-ink-border">
        {submissions.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-parchment">{(s.users as unknown as { name: string } | null)?.name}</p>
              <p className="tabular text-xs text-parchment-dim">
                {s.submitted_at ? formatTimestamp(s.submitted_at) : ""}
              </p>
            </div>
            <ApproveButton submissionId={s.id} type={type} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
