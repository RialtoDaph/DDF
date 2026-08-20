"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";

export function IngredientsCard({
  canManage,
  list,
  addForm,
}: {
  canManage: boolean;
  list: React.ReactNode;
  addForm: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Zutaten"
        right={
          canManage ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-xs text-wine hover:underline whitespace-nowrap"
            >
              {open ? "Abbrechen" : "+ Zutat hinzufügen"}
            </button>
          ) : undefined
        }
      />
      {list}
      {canManage && open && <div className="mt-3">{addForm}</div>}
    </Card>
  );
}
