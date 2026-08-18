import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { StampBadge } from "@/components/ui/StampBadge";
import { AlertTriangle, ListChecks, Sunrise, Moon } from "lucide-react";

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

  let openingStatus: string | null = null;
  let closingStatus: string | null = null;

  if (templates && templates.length > 0) {
    const templateIds = templates.map((t) => t.id);
    const { data: submissions } = await supabase
      .from("checklist_submissions")
      .select("id, template_id, status, date")
      .in("template_id", templateIds)
      .eq("date", today)
      .eq("user_id", profile.id);

    const openingTemplate = templates.find((t) => t.name === "opening");
    const closingTemplate = templates.find((t) => t.name === "closing");
    openingStatus = submissions?.find((s) => s.template_id === openingTemplate?.id)?.status ?? null;
    closingStatus = submissions?.find((s) => s.template_id === closingTemplate?.id)?.status ?? null;
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Sunrise size={16} className="text-wine" />
              <span className="text-parchment-dim">Opening</span>
            </div>
            <ChecklistStatusBadge status={openingStatus} />
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Moon size={16} className="text-wine" />
              <span className="text-parchment-dim">Closing</span>
            </div>
            <ChecklistStatusBadge status={closingStatus} />
          </div>
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
