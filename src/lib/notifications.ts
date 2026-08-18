import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Profile } from "@/lib/auth";

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

  const [{ data: items }, { data: expiring }, { data: tasks }, { data: templates }] = await Promise.all([
    supabase.from("inventory_items").select("id, name, current_stock, par_level"),
    supabase
      .from("stock_movements")
      .select("id, expiry_date, inventory_items(name)")
      .not("expiry_date", "is", null)
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
    const templateIds = templates.map((t) => t.id);
    const { data: submissions } = await supabase
      .from("checklist_submissions")
      .select("template_id, status")
      .in("template_id", templateIds)
      .eq("date", today10)
      .eq("user_id", profile.id);

    const openingTemplate = templates.find((t) => t.name === "opening");
    const closingTemplate = templates.find((t) => t.name === "closing");
    const openingDone = submissions?.some((s) => s.template_id === openingTemplate?.id && s.status !== "draft");
    const closingDone = submissions?.some((s) => s.template_id === closingTemplate?.id && s.status !== "draft");

    if (openingTemplate && !openingDone) {
      notifications.push({
        id: "checklist-opening",
        message: "Opening-Checkliste heute noch nicht eingereicht",
        href: "/checklists/opening",
        severity: "info",
      });
    }
    if (closingTemplate && !closingDone) {
      notifications.push({
        id: "checklist-closing",
        message: "Closing-Checkliste heute noch nicht eingereicht",
        href: "/checklists/closing",
        severity: "info",
      });
    }
  }

  return notifications.slice(0, 20);
}
