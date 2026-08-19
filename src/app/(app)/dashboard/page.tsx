import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { StampBadge } from "@/components/ui/StampBadge";
import { AlertTriangle, ListChecks, Sunrise, Moon, CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKLIST_TYPES, CHECKLIST_LABEL, periodStartFor } from "@/app/(app)/checklists/shared/lib";
import type { ChecklistType } from "@/lib/database.types";

const CHECKLIST_ICON = {
  opening: Sunrise,
  closing: Moon,
  weekly: CalendarDays,
  monthly: CalendarRange,
} as const;

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const isStaff = profile.role === "staff";
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: items }, { data: tasks }, { data: templates }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("id, name, unit, current_stock, par_level, category"),
    isStaff
      ? supabase
          .from("tasks")
          .select("id, title, status, due_date, recurrence")
          .eq("assigned_to", profile.id)
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false })
      : supabase
          .from("tasks")
          .select("id, title, status, due_date, assigned_to")
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false }),
    profile.outlet_id
      ? supabase.from("checklist_templates").select("id, name").eq("outlet_id", profile.outlet_id)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const criticalItems = (items ?? [])
    .filter((i) => i.par_level > 0 && i.current_stock / i.par_level <= 0.5)
    .sort((a, b) => a.current_stock / a.par_level - b.current_stock / b.par_level)
    .slice(0, 8);

  // Each checklist type is measured against its own period — the Wochencheck
  // counts as done for the whole week, not just for today.
  const checklistStatus: { type: ChecklistType; status: string | null }[] = [];

  if (templates && templates.length > 0) {
    const periods = [...new Set(CHECKLIST_TYPES.map((t) => periodStartFor(t)))];
    const { data: submissions } = await supabase
      .from("checklist_submissions")
      .select("template_id, status, period_start")
      .in("template_id", templates.map((t) => t.id))
      .in("period_start", periods)
      .eq("user_id", profile.id);

    for (const type of CHECKLIST_TYPES) {
      const template = templates.find((t) => t.name === type);
      if (!template) continue;
      const period = periodStartFor(type);
      const status =
        submissions?.find((s) => s.template_id === template.id && s.period_start === period)?.status ?? null;
      checklistStatus.push({ type, status });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.3em] uppercase text-wine mb-1">
          {today.split("-").reverse().join(".")}
        </p>
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">Willkommen, {profile.name.split(" ")[0]}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/inventory">
          <Card className="hover:border-wine/50 transition-colors">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className={criticalItems.length ? "text-warn" : "text-parchment-dim"} />
              <div>
                <p className="tabular text-2xl text-parchment">{criticalItems.length}</p>
                <p className="text-xs text-parchment-dim">Kritischer Bestand</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/tasks">
          <Card className="hover:border-wine/50 transition-colors">
            <div className="flex items-center gap-3">
              <ListChecks size={20} className="text-wine" />
              <div>
                <p className="tabular text-2xl text-parchment">{tasks?.length ?? 0}</p>
                <p className="text-xs text-parchment-dim">{isStaff ? "Meine offenen Aufgaben" : "Offene Aufgaben"}</p>
              </div>
            </div>
          </Card>
        </Link>
        <Card>
          {checklistStatus.length === 0 ? (
            <p className="text-sm text-parchment-dim">Noch keine Checklisten-Vorlagen angelegt.</p>
          ) : (
            checklistStatus.map(({ type, status }, i) => {
              const Icon = CHECKLIST_ICON[type];
              return (
                <Link
                  key={type}
                  href={`/checklists/${type}`}
                  className={cn("flex items-center justify-between gap-2", i > 0 && "mt-2")}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Icon size={16} className="text-wine" />
                    <span className="text-parchment-dim">{CHECKLIST_LABEL[type]}</span>
                  </span>
                  <ChecklistStatusBadge status={status} />
                </Link>
              );
            })
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Kritischer Bestand"
          subtitle="Artikel unter 50% des Sollbestands"
          right={
            <Link href="/inventory" className="text-sm text-wine hover:underline">
              Alle ansehen
            </Link>
          }
        />
        {criticalItems.length === 0 ? (
          <p className="text-sm text-parchment-dim">Kein Artikel kritisch. Alles im gruenen Bereich.</p>
        ) : (
          <div className="space-y-3">
            {criticalItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <span className="text-sm text-parchment w-40 truncate">{item.name}</span>
                <GaugeBar current={item.current_stock} par={item.par_level} unit={item.unit} className="flex-1" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title={isStaff ? "Meine Aufgaben" : "Offene Aufgaben"} />
        {!tasks || tasks.length === 0 ? (
          <p className="text-sm text-parchment-dim">Keine offenen Aufgaben.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {tasks.slice(0, 6).map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-parchment">{task.title}</span>
                <span className="tabular text-xs text-parchment-dim">
                  {task.due_date ? task.due_date.split("-").reverse().join(".") : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ChecklistStatusBadge({ status }: { status: string | null }) {
  if (status === "approved") return <StampBadge>Freigegeben</StampBadge>;
  if (status === "submitted") return <StampBadge>Eingereicht</StampBadge>;
  if (status === "draft") return <StampBadge variant="warn">Entwurf</StampBadge>;
  return <StampBadge variant="warn">Offen</StampBadge>;
}
