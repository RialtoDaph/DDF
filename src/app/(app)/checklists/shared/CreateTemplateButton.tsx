"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDefaultTemplate } from "./actions";
import { Button } from "@/components/ui/Button";
import type { ChecklistType } from "@/lib/database.types";

export function CreateTemplateButton({ type }: { type: ChecklistType }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      onClick={() =>
        startTransition(async () => {
          await createDefaultTemplate(type);
          router.refresh();
        })
      }
      disabled={pending}
    >
      {pending ? "Wird angelegt…" : "Standard-Vorlage anlegen"}
    </Button>
  );
}
