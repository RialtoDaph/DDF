"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveChecklist } from "./actions";
import { Button } from "@/components/ui/Button";
import type { ChecklistType } from "@/lib/database.types";

export function ApproveButton({ submissionId, type }: { submissionId: string; type: ChecklistType }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await approveChecklist(submissionId, type);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Freigeben"}
    </Button>
  );
}
