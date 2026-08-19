import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChecklistType } from "@/lib/database.types";
import type { Profile } from "@/lib/auth";
import { CHECKLIST_TYPES, periodStartFor } from "@/app/(app)/checklists/shared/lib";

export interface Notification {
  id: string;
  message: string;
  href: string;
  severity: "warn" | "info";
}

export async function getNotifications(
  supabase: SupabaseClient<Database>,
  profile: Profile,
): Promise<Notification[]> {
  const notifications: Notification[] = [];
  const today = new Date();
  const today10 = today.toISOString().slice(0, 10);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  // Goods receipts stay in stock_movements forever, so without a lower bound
  // every expiry date ever recorded keeps reporting "abgelaufen" and crowds
  // the newer alerts out of the (capped) bell list.
  const since30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: items }, { data: expiring }, { data: tasks }, { data: templates }] = await Promise.all([
    supabase.from("inventory_items").select("id, name, current_stock, par_level"),
    supabase
      .from("stock_movements")
      .select("id, expiry_date, inventory_items(name)")
      .not("expiry_date", "is", null)
      .gte("expiry_date", since30Days)
      .lte("expiry_date", in7Days)
      .order("expiry_date", { ascending: true })
      .limit(5),
    profile.role === "staff"
      ? supabase
          .from("tasks")
          .select("id, title, due_date")
          .eq("assigned_to", profile.id)
          .neq("status", "done")
          .lte("due_date", today10)
      : supabase.from("tasks").select("id, title, due_date").neq("status", "done").lte("due_date", today10),
    profile.outlet_id
      ? supabase.from("checklist_templates").select("id, name").eq("outlet_id", profile.outlet_id)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  for (const item of items ?? []) {
    if (item.par_level > 0 && item.current_stock / item.par_level <= 0.2) {
      notifications.push({
        id: `stock-${item.id}`,
        message: `${item.name}: kritischer Bestand (${item.current_stock})`,
        href: `/inventory/${item.id}`,
        severity: "warn",
      });
    }
  }

  for (const e of expiring ?? []) {
    const name = (e.inventory_items as unknown as { name: string } | null)?.name ?? "Artikel";
    const expired = e.expiry_date! < today10;
    notifications.push({
      id: `expiry-${e.id}`,
      message: `${name}: ${expired ? "abgelaufen" : "läuft bald ab"} (${e.expiry_date})`,
      href: "/reports",
      severity: "warn",
    });
  }

  for (const t of tasks ?? []) {
    notifications.push({
      id: `task-${t.id}`,
      message: `Aufgabe fällig: ${t.title}`,
      href: "/tasks",
      severity: t.due_date && t.due_date < today10 ? "warn" : "info",
    });
  }

  if (profile.outlet_id && templates && templates.length > 0) {
    const periods = [...new Set(CHECKLIST_TYPES.map((t) => periodStartFor(t)))];
    const { data: submissions } = await supabase
      .from("checklist_submissions")
      .select("template_id, status, period_start")
      .in("template_id", templates.map((t) => t.id))
      .in("period_start", periods)
      .eq("user_id", profile.id);

    // Each type is judged against its own period, so a Wochencheck stops
    // nagging for the rest of the week once it has been handed in.
    const OPEN_LABEL: Record<ChecklistType, string> = {
      opening: "Opening-Checkliste heute noch nicht eingereicht",
      closing: "Closing-Checkliste heute noch nicht eingereicht",
      weekly: "Wochencheck diese Woche noch nicht eingereicht",
      monthly: "Monatscheck diesen Monat noch nicht eingereicht",
    };

    for (const type of CHECKLIST_TYPES) {
      const template = templates.find((t) => t.name === type);
      if (!template) continue;

      const period = periodStartFor(type);
      const done = submissions?.some(
        (s) => s.template_id === template.id && s.period_start === period && s.status !== "draft",
      );
      if (done) continue;

      notifications.push({
        id: `checklist-${type}`,
        message: OPEN_LABEL[type],
        href: `/checklists/${type}`,
        severity: "info",
      });
    }
  }

  return notifications.slice(0, 20);
}
