"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitChecklist, approveChecklist } from "./actions";
import { Button } from "@/components/ui/Button";
import { StampBadge } from "@/components/ui/StampBadge";
import type { ChecklistType, SubmissionStatus } from "@/lib/database.types";

export function SubmitBar({
  submissionId,
  type,
  status,
  allSatisfied,
  canApproveRole,
}: {
  submissionId: string;
  type: ChecklistType;
  status: SubmissionStatus;
  allSatisfied: boolean;
  canApproveRole: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await submitChecklist(submissionId, type);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const res = await approveChecklist(submissionId, type);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="paper-card p-4 flex flex-col gap-3 sticky bottom-4">
      {error && <p className="text-sm text-warn">{error}</p>}
      {status === "draft" && (
        <>
          {!allSatisfied && (
            <p className="text-xs text-parchment-dim">
              Alle fotopflichtigen Punkte muessen abgehakt und fotografiert sein, bevor eingereicht werden kann.
            </p>
          )}
          <Button onClick={handleSubmit} disabled={!allSatisfied || pending} className="w-full">
            {pending ? "Wird eingereicht…" : "Bericht einreichen"}
          </Button>
        </>
      )}
      {status === "submitted" && (
        <div className="flex items-center justify-between gap-3">
          <StampBadge>Eingereicht — wartet auf Freigabe</StampBadge>
          {canApproveRole && (
            <Button onClick={handleApprove} disabled={pending} variant="secondary">
              {pending ? "…" : "Freigeben"}
            </Button>
          )}
        </div>
      )}
      {status === "approved" && <StampBadge>Freigegeben</StampBadge>}
    </div>
  );
}
