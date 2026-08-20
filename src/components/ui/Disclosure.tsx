"use client";

import { useState } from "react";

/** Text-link button that reveals its children — the handoff's recurring "+ X hinzufügen" pattern (Zutaten, Handbuch, Quiz). */
export function Disclosure({
  label,
  closeLabel = "Abbrechen",
  children,
  className,
}: {
  label: string;
  closeLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-wine hover:underline whitespace-nowrap">
        {open ? closeLabel : label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
