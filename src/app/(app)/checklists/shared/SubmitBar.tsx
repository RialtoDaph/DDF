"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitChecklist } from "./actions";
import { Button } from "@/components/ui/Button";
import type { ChecklistType, SubmissionStatus } from "@/lib/database.types";

/** Draft-only: the submitted/approved states are shown in the checklist card's own header instead (status badge + Freigeben button). */
export function SubmitBar({
  submissionId,
  type,
  status,
  allSatisfied,
}: {
  submissionId: string;
  type: ChecklistType;
  status: SubmissionStatus;
  allSatisfied: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (status !== "draft") return null;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await submitChecklist(submissionId, type);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="paper-card p-4 flex flex-col gap-3 sticky bottom-4">
      {error && <p className="text-sm text-warn">{error}</p>}
      {!allSatisfied && (
        <p className="text-xs text-parchment-dim">
          Alle fotopflichtigen Punkte muessen abgehakt und fotografiert sein, bevor eingereicht werden kann.
        </p>
      )}
      <Button onClick={handleSubmit} disabled={!allSatisfied || pending} className="w-full">
        {pending ? "Wird eingereicht…" : "Bericht einreichen"}
      </Button>
    </div>
  );
}
