import Link from "next/link";
import { requireProfile, canApprove, canManageMasterData, canAssignTasks } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { StampBadge } from "@/components/ui/StampBadge";
import { LinkChip } from "@/components/ui/Chip";
import { AlertTriangle, ListChecks, Sunrise, Moon, CalendarDays, CalendarRange, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKLIST_TYPES, CHECKLIST_LABEL, periodStartFor } from "@/app/(app)/checklists/shared/lib";
import { buildStockTrend, sparkPoints, computeApprovedStreak } from "./lib";
import { HandoverWidget } from "./HandoverWidget";
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
  const isApprover = canApprove(profile.role);
  const now = new Date();
  // Read date/hour/weekday in the outlet's own timezone rather than the
  // server's — on a UTC-hosted server this otherwise flips "today", the
  // greeting, and the weekend flag around midnight Europe/Berlin (same
  // class of bug periodStartFor() guards against below).
  const berlinParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);
  const berlinPart = (t: string) => berlinParts.find((p) => p.type === t)?.value ?? "";
  const today = `${berlinPart("year")}-${berlinPart("month")}-${berlinPart("day")}`;
  const dateLabel = now
    .toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" })
    .toUpperCase();
  const hour = Number(berlinPart("hour"));
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const isWeekend = berlinPart("weekday") === "Sat" || berlinPart("weekday") === "Sun";

  const [{ data: items }, { data: tasks }, { data: templates }, { data: latestHandover }, { data: events }] =
    await Promise.all([
      supabase
        .from("inventory_items")
        .select("id, name, unit, current_stock, par_level"),
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
      profile.outlet_id
        ? supabase
            .from("handover_notes")
            .select("content, users(name)")
            .eq("outlet_id", profile.outlet_id)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      profile.outlet_id
        ? supabase
            .from("events")
            .select("id, label, event_date")
            .eq("outlet_id", profile.outlet_id)
            .gte("event_date", today)
            .order("event_date", { ascending: true })
            .limit(5)
        : Promise.resolve({ data: [] as { id: string; label: string; event_date: string }[] }),
    ]);

  const criticalItems = (items ?? [])
    .filter((i) => i.par_level > 0 && i.current_stock / i.par_level <= 0.5)
    .sort((a, b) => a.current_stock / a.par_level - b.current_stock / b.par_level)
    .slice(0, 8);

  const since7d = new Date(now);
  since7d.setDate(since7d.getDate() - 6);
  const { data: recentMovements } =
    criticalItems.length > 0
      ? await supabase
          .from("stock_movements")
          .select("item_id, type, quantity, date")
          .in(
            "item_id",
            criticalItems.map((i) => i.id),
          )
          .gte("date", since7d.toISOString().slice(0, 10))
      : { data: [] as { item_id: string; type: "in" | "out"; quantity: number; date: string }[] };

  const criticalWithTrend = criticalItems.map((item) => {
    const movements = (recentMovements ?? []).filter((m) => m.item_id === item.id);
    const trend = buildStockTrend(item.current_stock, movements);
    return { ...item, sparkPoints: sparkPoints(trend) };
  });

  // Each checklist type is measured against its own period — the Wochencheck
  // counts as done for the whole week, not just for today.
  const checklistStatus: { type: ChecklistType; status: string | null; templateId: string }[] = [];
  let pendingCount = 0;
  let firstPendingType: ChecklistType | null = null;
  let openingStreak = 0;

  if (templates && templates.length > 0) {
    const periods = [...new Set(CHECKLIST_TYPES.map((t) => periodStartFor(t)))];
    const openingTemplate = templates.find((t) => t.name === "opening");
    const [{ data: submissions }, { data: pendingSubs }, streak] = await Promise.all([
      supabase
        .from("checklist_submissions")
        .select("template_id, status, period_start")
        .in(
          "template_id",
          templates.map((t) => t.id),
        )
        .in("period_start", periods)
        .eq("user_id", profile.id),
      isApprover
        ? supabase
            .from("checklist_submissions")
            .select("template_id")
            .in(
              "template_id",
              templates.map((t) => t.id),
            )
            .eq("status", "submitted")
        : Promise.resolve({ data: [] as { template_id: string }[] }),
      openingTemplate ? computeApprovedStreak(supabase, openingTemplate.id) : Promise.resolve(0),
    ]);

    for (const type of CHECKLIST_TYPES) {
      const template = templates.find((t) => t.name === type);
      if (!template) continue;
      const period = periodStartFor(type);
      const status =
        submissions?.find((s) => s.template_id === template.id && s.period_start === period)?.status ?? null;
      checklistStatus.push({ type, status, templateId: template.id });
    }

    pendingCount = pendingSubs?.length ?? 0;
    if (pendingCount > 0) {
      const firstPendingTemplateId = pendingSubs![0].template_id;
      firstPendingType = templates.find((t) => t.id === firstPendingTemplateId)?.name as ChecklistType | undefined ?? null;
    }

    openingStreak = streak;
  }

  const canManage = canManageMasterData(profile.role);
  const canAssign = canAssignTasks(profile.role);
  const handoverLatest = latestHandover
    ? { content: latestHandover.content, user_name: (latestHandover.users as unknown as { name: string } | null)?.name ?? "—" }
    : null;

  return (
    <div className="space-y-[var(--sp-lg)]">
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-wine mb-1.5">{dateLabel}</p>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">
            {greeting}, {profile.name.split(" ")[0]}
          </h1>
        </div>
        <span className="rounded-full border border-ink-border bg-ink-card px-3.5 py-1.5 text-xs text-parchment-dim whitespace-nowrap">
          {isWeekend ? "Wochenende · mehr Betrieb erwartet" : "Werktag · normaler Betrieb erwartet"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <LinkChip variant="action" href="/checklists/opening">
          Checkliste prüfen
        </LinkChip>
        <LinkChip variant="action" href="/inventory">
          {canManage ? "Bestand verwalten" : "Bestand ansehen"}
        </LinkChip>
        <LinkChip variant="action" href="/tasks">
          {canAssign ? "+ Aufgabe zuweisen" : "Aufgabe abschließen"}
        </LinkChip>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/inventory">
          <Card className="hover:border-wine/50 transition-colors">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-[38px] w-[38px] items-center justify-center rounded-[9px]",
                  criticalItems.length ? "bg-warn/15" : "bg-ink-raised",
                )}
              >
                <AlertTriangle size={17} className={criticalItems.length ? "text-warn" : "text-parchment-dim"} />
              </span>
              <div>
                <p className="tabular text-[22px] text-parchment leading-none">{criticalItems.length}</p>
                <p className="text-xs text-parchment-dim mt-1">Kritischer Bestand</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/tasks">
          <Card className="hover:border-wine/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-wine/15">
                <ListChecks size={17} className="text-wine" />
              </span>
              <div>
                <p className="tabular text-[22px] text-parchment leading-none">{tasks?.length ?? 0}</p>
                <p className="text-xs text-parchment-dim mt-1">{isStaff ? "Meine offenen Aufgaben" : "Offene Aufgaben"}</p>
              </div>
            </div>
          </Card>
        </Link>
        <Card>
          {checklistStatus.length === 0 ? (
            <p className="text-sm text-parchment-dim">Noch keine Checklisten-Vorlagen angelegt.</p>
          ) : (
            <div className="space-y-2">
              {checklistStatus.slice(0, 2).map(({ type, status }) => {
                const Icon = CHECKLIST_ICON[type];
                return (
                  <Link key={type} href={`/checklists/${type}`} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm text-parchment-dim">
                      <Icon size={15} className="text-wine shrink-0" />
                      {CHECKLIST_LABEL[type]}
                      {type === "opening" && openingStreak > 1 && (
                        <span className="flex items-center gap-0.5 text-[11px] text-warn">
                          <Flame size={11} />
                          {openingStreak}T
                        </span>
                      )}
                    </span>
                    <ChecklistStatusBadge status={status} />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 min-[900px]:grid-cols-[2.1fr_1fr] gap-[var(--sp-lg)] items-start">
        <div className="flex flex-col gap-[var(--sp-lg)] min-w-0">
          <Card>
            <CardHeader
              title="Kritischer Bestand"
              subtitle="Artikel unter 50% des Sollbestands"
              right={
                <Link href="/inventory" className="text-sm text-wine hover:underline whitespace-nowrap">
                  Alle ansehen →
                </Link>
              }
            />
            {criticalWithTrend.length === 0 ? (
              <p className="text-sm text-parchment-dim">Kein Artikel kritisch. Alles im grünen Bereich.</p>
            ) : (
              <div className="space-y-3.5">
                {criticalWithTrend.map((item) => (
                  <div key={item.id} className="flex items-center gap-3.5">
                    <span className="text-sm text-parchment w-36 shrink-0 truncate">{item.name}</span>
                    <svg viewBox="0 0 100 28" className="w-14 h-5 shrink-0" preserveAspectRatio="none">
                      <polyline points={item.sparkPoints} fill="none" stroke="var(--color-parchment-dim)" strokeWidth="2" />
                    </svg>
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
                  <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
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

        <div className="flex flex-col gap-[var(--sp-md)] min-w-0">
          {isApprover && pendingCount > 0 && (
            <Link
              href={firstPendingType ? `/checklists/${firstPendingType}` : "/checklists/opening"}
              className="block rounded-xl border border-warn bg-warn/10 px-3.5 py-3"
            >
              <p className="text-sm text-parchment">{pendingCount} Checkliste(n) warten auf Freigabe</p>
              <p className="text-xs text-warn mt-1">Jetzt prüfen →</p>
            </Link>
          )}

          {profile.outlet_id && <HandoverWidget latest={handoverLatest} />}

          <Card className="p-3.5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-parchment-dim mb-2">Anstehende Termine</p>
            {!events || events.length === 0 ? (
              <p className="text-xs text-parchment-dim">Keine Termine geplant.</p>
            ) : (
              <ul className="divide-y divide-ink-border/60">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-xs text-parchment-dim">{ev.label}</span>
                    <span className="tabular text-[10.5px] text-parchment-dim whitespace-nowrap">
                      {ev.event_date.split("-").reverse().join(".")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChecklistStatusBadge({ status }: { status: string | null }) {
  if (status === "approved") return <StampBadge>Freigegeben</StampBadge>;
  if (status === "submitted") return <StampBadge>Eingereicht</StampBadge>;
  if (status === "draft") return <StampBadge variant="warn">Entwurf</StampBadge>;
  return <StampBadge variant="warn">Offen</StampBadge>;
}
