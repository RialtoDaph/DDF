"use client";

import { useState } from "react";

export function DetailShell({
  title,
  subtitle,
  canManage,
  editForm,
  children,
}: {
  title: string;
  subtitle: string;
  canManage: boolean;
  editForm: React.ReactNode;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="max-w-xl space-y-[var(--sp-lg)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">{title}</h1>
          <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">{subtitle}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="shrink-0 rounded-lg border border-ink-border px-4 py-2 text-sm text-parchment-dim hover:text-parchment hover:border-wine/40 transition-colors whitespace-nowrap"
          >
            {editing ? "Abbrechen" : "Bearbeiten"}
          </button>
        )}
      </div>

      {editing && editForm}

      {children}
    </div>
  );
}
