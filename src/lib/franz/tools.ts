import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Profile } from "@/lib/auth";
import { canManageMasterData } from "@/lib/auth";
import { recipeLineCost } from "@/lib/recipeCost";
import { CHECKLIST_TYPES, CHECKLIST_LABEL, periodStartFor } from "@/app/(app)/checklists/shared/lib";

export interface FranzToolContext {
  supabase: SupabaseClient<Database>;
  profile: Profile;
}

// German labels for the LLM's own output — Franz should talk in the app's
// vocabulary, not echo the raw enum values back at staff.
const CATEGORY_LABEL: Record<string, string> = {
  spirits: "Spirituosen",
  beer: "Bier",
  wine: "Wein",
  mixer: "Mixer",
  garnish: "Garnitur",
  herbs_produce: "Frische Kräuter & Früchte",
  juice: "Saft",
  liqueur: "Likör",
  schnapps: "Schnaps",
  syrup: "Sirup",
  bitters: "Bitter",
  consumable: "Verbrauch",
};

/**
 * Every tool here reads through the caller's own RLS-scoped Supabase client
 * (ctx.supabase, built from their session — see /api/franz/route.ts) — never
 * a service-role client. A staff member can only ever get back what RLS
 * would already let them see by clicking around the app themselves; nothing
 * here is a second, less-audited path to the data.
 */

async function getLowStock(ctx: FranzToolContext) {
  if (!ctx.profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const { data, error } = await ctx.supabase
    .from("inventory_items")
    .select("name, category, current_stock, par_level, unit")
    .eq("outlet_id", ctx.profile.outlet_id)
    .order("name");

  if (error) return { error: error.message };

  const low = (data ?? [])
    .filter((i) => i.current_stock <= i.par_level)
    .map((i) => ({
      name: i.name,
      kategorie: CATEGORY_LABEL[i.category] ?? i.category,
      bestand: `${i.current_stock} ${i.unit}`,
      soll: `${i.par_level} ${i.unit}`,
    }));

  return { anzahl_unter_soll: low.length, artikel: low };
}

async function getOpenTasks(ctx: FranzToolContext) {
  let query = ctx.supabase
    .from("tasks")
    .select("title, status, due_date, assigned_to")
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (ctx.profile.outlet_id) query = query.eq("outlet_id", ctx.profile.outlet_id);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return {
    anzahl_offen: data?.length ?? 0,
    aufgaben: (data ?? []).map((t) => ({
      titel: t.title,
      status: t.status === "in_progress" ? "in Arbeit" : "offen",
      faellig: t.due_date,
    })),
  };
}

async function getChecklistStatus(ctx: FranzToolContext) {
  if (!ctx.profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const { data: templates, error } = await ctx.supabase
    .from("checklist_templates")
    .select("id, name")
    .eq("outlet_id", ctx.profile.outlet_id);

  if (error) return { error: error.message };

  const result: Record<string, string> = {};
  for (const type of CHECKLIST_TYPES) {
    const template = templates?.find((t) => t.name === type);
    if (!template) {
      result[CHECKLIST_LABEL[type]] = "keine Vorlage angelegt";
      continue;
    }

    const periodStart = periodStartFor(type);
    // Staff only ever gets their own rows back here (RLS); owner/manager
    // see every submission in the outlet for this period — same boundary
    // as the Checklisten page itself, not a Franz-specific rule.
    const { data: submissions } = await ctx.supabase
      .from("checklist_submissions")
      .select("status")
      .eq("template_id", template.id)
      .eq("period_start", periodStart);

    if (!submissions || submissions.length === 0) {
      result[CHECKLIST_LABEL[type]] = "noch nicht begonnen";
    } else if (submissions.some((s) => s.status === "approved")) {
      result[CHECKLIST_LABEL[type]] = "freigegeben";
    } else if (submissions.some((s) => s.status === "submitted")) {
      result[CHECKLIST_LABEL[type]] = "eingereicht, wartet auf Freigabe";
    } else {
      result[CHECKLIST_LABEL[type]] = "als Entwurf begonnen, noch nicht eingereicht";
    }
  }

  return result;
}

async function getOpenOrders(ctx: FranzToolContext) {
  if (!ctx.profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const { data, error } = await ctx.supabase
    .from("order_list_items")
    .select("item_name, quantity, supplier_name, notes")
    .eq("outlet_id", ctx.profile.outlet_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  return {
    anzahl_offen: data?.length ?? 0,
    eintraege: (data ?? []).map((o) => ({
      artikel: o.item_name,
      menge: o.quantity,
      lieferant: o.supplier_name,
      notiz: o.notes,
    })),
  };
}

async function getUpcomingEvents(ctx: FranzToolContext) {
  if (!ctx.profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const today = new Date().toISOString().slice(0, 10);
  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, error } = await ctx.supabase
    .from("events")
    .select("label, event_date")
    .eq("outlet_id", ctx.profile.outlet_id)
    .gte("event_date", today)
    .lte("event_date", in14Days)
    .order("event_date", { ascending: true });

  if (error) return { error: error.message };

  return { termine: (data ?? []).map((e) => ({ titel: e.label, datum: e.event_date })) };
}

async function getRecipeCost(ctx: FranzToolContext, input: { menu_item_name: string }) {
  const { data: menuItem, error: menuError } = await ctx.supabase
    .from("menu_items")
    .select("id, name, sale_price")
    .ilike("name", `%${input.menu_item_name}%`)
    .limit(1)
    .maybeSingle();

  if (menuError) return { error: menuError.message };
  if (!menuItem) return { error: `Kein Menüpunkt gefunden, der zu "${input.menu_item_name}" passt.` };

  const { data: recipes, error: recipeError } = await ctx.supabase
    .from("recipes")
    .select("amount, inventory_items(name, unit_volume_ml, purchase_price)")
    .eq("menu_item_id", menuItem.id);

  if (recipeError) return { error: recipeError.message };

  const cost = (recipes ?? []).reduce(
    (sum, r) => sum + recipeLineCost(r.amount, r.inventory_items as unknown as { unit_volume_ml: number | null; purchase_price: number | null } | null),
    0,
  );
  const margin = menuItem.sale_price - cost;

  return {
    menuepunkt: menuItem.name,
    verkaufspreis: menuItem.sale_price,
    wareneinsatz: Math.round(cost * 100) / 100,
    marge: Math.round(margin * 100) / 100,
  };
}

async function searchHandbook(ctx: FranzToolContext, input: { query: string }) {
  if (!ctx.profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  // Two parameterized .ilike() calls merged in JS, rather than interpolating
  // the search term into a raw .or() filter expression — PostgREST's filter
  // DSL treats commas/parens specially, so a hand-built .or() string is a
  // filter-injection footgun even though RLS bounds the outcome here anyway.
  const [{ data: byTitle, error: titleError }, { data: byBody, error: bodyError }] = await Promise.all([
    ctx.supabase
      .from("handbook_sections")
      .select("title, body, category")
      .eq("outlet_id", ctx.profile.outlet_id)
      .ilike("title", `%${input.query}%`)
      .limit(3),
    ctx.supabase
      .from("handbook_sections")
      .select("title, body, category")
      .eq("outlet_id", ctx.profile.outlet_id)
      .ilike("body", `%${input.query}%`)
      .limit(3),
  ]);

  if (titleError) return { error: titleError.message };
  if (bodyError) return { error: bodyError.message };

  const seen = new Set<string>();
  const merged = [...(byTitle ?? []), ...(byBody ?? [])].filter((s) => {
    if (seen.has(s.title)) return false;
    seen.add(s.title);
    return true;
  });

  if (merged.length === 0) return { treffer: [], hinweis: "Nichts im Handbuch gefunden." };

  return { treffer: merged.slice(0, 3).map((s) => ({ titel: s.title, kategorie: s.category, inhalt: s.body })) };
}

const BASE_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_low_stock",
    description: "Zeigt Inventar-Artikel, deren aktueller Bestand unter dem Sollbestand (par level) liegt.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_open_tasks",
    description: "Zeigt offene und in Arbeit befindliche Aufgaben (Aufgaben-Liste).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_checklist_status",
    description:
      "Zeigt den Status der Opening-, Closing-, Wochen- und Monatscheckliste für die laufende Periode (nicht begonnen / Entwurf / eingereicht / freigegeben).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_open_orders",
    description: "Zeigt offene Einträge in der Bestellliste (was noch besorgt werden muss).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_upcoming_events",
    description: "Zeigt anstehende Termine (Events) der nächsten 14 Tage.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "search_handbook",
    description: "Durchsucht das Handbuch (Hausregeln, Anleitungen) nach einem Stichwort.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Suchbegriff, z.B. 'Kasse' oder 'Notfall'." } },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

// Cost/margin data is owner/manager only — gated by not even offering the
// tool to staff, the same boundary Menü & Rezepte already draws in the UI.
// This mirrors canManageMasterData rather than inventing a Franz-specific rule.
const MANAGER_ONLY_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_recipe_cost",
    description: "Berechnet Wareneinsatz und Marge eines Menüpunkts anhand seines Rezepts.",
    input_schema: {
      type: "object",
      properties: { menu_item_name: { type: "string", description: "Name des Menüpunkts (Teilstring reicht)." } },
      required: ["menu_item_name"],
      additionalProperties: false,
    },
  },
];

export function toolsForRole(profile: Profile): Anthropic.Tool[] {
  return canManageMasterData(profile.role) ? [...BASE_TOOLS, ...MANAGER_ONLY_TOOLS] : BASE_TOOLS;
}

export async function runFranzTool(name: string, input: Record<string, unknown>, ctx: FranzToolContext): Promise<string> {
  // Defense in depth: even if a manager-only tool name somehow reached this
  // dispatcher, refuse it here too rather than trusting the tool list alone.
  if (MANAGER_ONLY_TOOLS.some((t) => t.name === name) && !canManageMasterData(ctx.profile.role)) {
    return JSON.stringify({ error: "Dafür fehlt dir die Berechtigung." });
  }

  switch (name) {
    case "get_low_stock":
      return JSON.stringify(await getLowStock(ctx));
    case "get_open_tasks":
      return JSON.stringify(await getOpenTasks(ctx));
    case "get_checklist_status":
      return JSON.stringify(await getChecklistStatus(ctx));
    case "get_open_orders":
      return JSON.stringify(await getOpenOrders(ctx));
    case "get_upcoming_events":
      return JSON.stringify(await getUpcomingEvents(ctx));
    case "get_recipe_cost":
      return JSON.stringify(await getRecipeCost(ctx, input as { menu_item_name: string }));
    case "search_handbook":
      return JSON.stringify(await searchHandbook(ctx, input as { query: string }));
    default:
      return JSON.stringify({ error: `Unbekanntes Tool: ${name}` });
  }
}
