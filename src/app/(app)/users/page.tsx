import { redirect } from "next/navigation";
import { requireProfile, canManageUsers } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { UserRow } from "./UserRow";

export default async function UsersPage() {
  const profile = await requireProfile();
  if (!canManageUsers(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: users }, { data: outlets }] = await Promise.all([
    supabase.from("users").select("id, name, email, role, outlet_id, is_active").order("name"),
    supabase.from("outlets").select("id, name").order("name"),
  ]);

  const canEditRole = profile.role === "owner";

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div>
        <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Benutzer</h1>
        <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">
          {canEditRole
            ? "Rollen, Standort und Aktiv-Status verwalten."
            : "Mitarbeitende deines Standorts aktivieren/deaktivieren."}
        </p>
      </div>

      <Card>
        <CardHeader title="Konten" subtitle="Neue Konten entstehen automatisch bei Anmeldung über die Login-Seite." />
        <ul className="divide-y divide-ink-border">
          {(users ?? []).map((u) => (
            <UserRow key={u.id} user={u} outlets={outlets ?? []} canEditRole={canEditRole} isSelf={u.id === profile.id} />
          ))}
          {(!users || users.length === 0) && <p className="text-sm text-parchment-dim py-2">Keine Nutzer gefunden.</p>}
        </ul>
      </Card>
    </div>
  );
}
