"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveChecklist } from "./actions";
import { Button } from "@/components/ui/Button";
import type { ChecklistType } from "@/lib/database.types";

export function ApproveButton({ submissionId, type }: { submissionId: string; type: ChecklistType }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const res = await approveChecklist(submissionId, type);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" disabled={pending} onClick={handleApprove}>
        {pending ? "…" : "Freigeben"}
      </Button>
      {error && <p className="text-xs text-warn">{error}</p>}
    </div>
  );
}
