"use client";

import { useActionState } from "react";
import { updateUserProfile } from "./actions";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { type ActionState, initialActionState } from "@/lib/actionState";
import type { UserRole } from "@/lib/database.types";

const ROLE_LABEL: Record<UserRole, string> = { owner: "Owner", manager: "Manager", staff: "Mitarbeiter" };

const ROLE_BADGE: Record<UserRole, string> = {
  owner: "border-wine text-wine bg-wine/10",
  manager: "border-parchment/40 text-parchment bg-transparent",
  staff: "border-ink-border text-parchment-dim bg-transparent",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserRow({
  user,
  outlets,
  canEditRole,
  isSelf,
}: {
  user: { id: string; name: string; email: string; role: UserRole; outlet_id: string | null; is_active: boolean };
  outlets: { id: string; name: string }[];
  canEditRole: boolean;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateUserProfile, initialActionState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 py-3">
      <input type="hidden" name="id" value={user.id} />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-card font-mono text-xs text-parchment-dim">
        {initials(user.name)}
      </span>
      <div className="min-w-40 flex-1">
        <p className="text-sm text-parchment">
          {user.name} {isSelf && <span className="text-parchment-dim text-xs">(du)</span>}
        </p>
        <p className="text-xs text-parchment-dim">{user.email}</p>
      </div>

      {canEditRole && !isSelf ? (
        <Select name="role" defaultValue={user.role} className="w-36">
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="staff">Mitarbeiter</option>
        </Select>
      ) : (
        // Own role is never editable here — demoting yourself would lock you
        // out of this page. Submit it unchanged so the update keeps it.
        <>
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide whitespace-nowrap",
              ROLE_BADGE[user.role],
            )}
          >
            {ROLE_LABEL[user.role]}
          </span>
          <input type="hidden" name="role" value={user.role} />
        </>
      )}

      {canEditRole ? (
        <Select name="outlet_id" defaultValue={user.outlet_id ?? ""} className="w-40">
          <option value="">— kein Standort —</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      ) : (
        <input type="hidden" name="outlet_id" value={user.outlet_id ?? ""} />
      )}

      {isSelf ? (
        // Same reasoning as the role field: you can't deactivate yourself. A
        // disabled checkbox submits nothing, which would read back as "off",
        // so the current value goes along as a hidden field instead.
        <>
          <span className="text-xs text-parchment-dim">Aktiv</span>
          <input type="hidden" name="is_active" value={user.is_active ? "on" : ""} />
        </>
      ) : (
        <label className="flex items-center gap-2 text-xs text-parchment-dim">
          <input type="checkbox" name="is_active" defaultChecked={user.is_active} className="accent-wine" />
          Aktiv
        </label>
      )}

      <Button type="submit" variant="ghost" disabled={pending} className="text-xs">
        {pending ? "…" : "Speichern"}
      </Button>
      {state?.error && <p className="text-xs text-warn w-full">{state.error}</p>}
      {state?.success && <p className="text-xs text-done w-full">Gespeichert.</p>}
    </form>
  );
}
