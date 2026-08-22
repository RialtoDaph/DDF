import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChecklistTemplateItem } from "@/lib/database.types";
import { periodStartFor } from "@/app/(app)/checklists/shared/lib";

const LINKED_ITEM_TEXT = "Bestellung";

/**
 * Keeps the weekly checklist's "Bestellung" item in sync with the order
 * list: checked once every order-list entry for the outlet is marked
 * "bestellt" (and there's at least one entry — an empty/unused list doesn't
 * count as "done"), unchecked again the moment a new open entry appears.
 * Only touches still-open (draft) weekly submissions for the current week —
 * a submitted/approved checklist is a historical record and must not change
 * after the fact. No-ops if the outlet's weekly template doesn't have a
 * "Bestellung" item at all.
 */
export async function syncBestellungChecklistItem(supabase: SupabaseClient<Database>, outletId: string) {
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id, items")
    .eq("outlet_id", outletId)
    .eq("name", "weekly")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!template) return;

  const items = (template.items as ChecklistTemplateItem[]) ?? [];
  if (!items.some((i) => i.text === LINKED_ITEM_TEXT)) return;

  const [{ count: openCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from("order_list_items")
      .select("id", { count: "exact", head: true })
      .eq("outlet_id", outletId)
      .eq("status", "open"),
    supabase.from("order_list_items").select("id", { count: "exact", head: true }).eq("outlet_id", outletId),
  ]);
  const allOrdered = (totalCount ?? 0) > 0 && (openCount ?? 0) === 0;

  const { data: submissions } = await supabase
    .from("checklist_submissions")
    .select("id")
    .eq("template_id", template.id)
    .eq("period_start", periodStartFor("weekly"))
    .eq("status", "draft");

  for (const sub of submissions ?? []) {
    await supabase
      .from("checklist_item_results")
      .upsert(
        { submission_id: sub.id, item_text: LINKED_ITEM_TEXT, checked: allOrdered },
        { onConflict: "submission_id,item_text" },
      );
  }
}
