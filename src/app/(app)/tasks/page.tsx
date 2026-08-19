import { requireProfile, canAssignTasks } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { TaskForm } from "./TaskForm";
import { TaskRow } from "./TaskRow";

export default async function TasksPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canAssign = canAssignTasks(profile.role);

  const [{ data: tasks }, { data: users }] = await Promise.all([
    supabase
      .from("tasks")
      // tasks has two FKs into users (assigned_to, created_by), so the
      // embed must name which one — otherwise PostgREST rejects the whole
      // query as ambiguous and this silently comes back empty.
      .select("id, title, description, status, due_date, recurrence, assigned_to, users!tasks_assigned_to_fkey(name)")
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false }),
    canAssign && profile.outlet_id
      ? supabase.from("users").select("id, name").eq("outlet_id", profile.outlet_id).eq("is_active", true)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const done = (tasks ?? []).filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-parchment">Aufgaben</h1>
          <p className="text-sm text-parchment-dim mt-1">
            {canAssign ? "Alle Aufgaben im Betrieb." : "Deine zugewiesenen Aufgaben."}
          </p>
        </div>
        {canAssign && <TaskForm users={users ?? []} />}
      </div>

      <Card>
        <CardHeader title="Offen" />
        {open.length === 0 ? (
          <p className="text-sm text-parchment-dim">Keine offenen Aufgaben.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {open.map((t) => (
              <TaskRow
                key={t.id}
                task={{ ...t, assignee_name: (t.users as unknown as { name: string } | null)?.name }}
                users={users ?? []}
                canEdit={canAssign}
              />
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card>
          <CardHeader title="Erledigt" />
          <ul className="divide-y divide-ink-border">
            {done.slice(0, 15).map((t) => (
              <TaskRow
                key={t.id}
                task={{ ...t, assignee_name: (t.users as unknown as { name: string } | null)?.name }}
                users={users ?? []}
                canEdit={canAssign}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
