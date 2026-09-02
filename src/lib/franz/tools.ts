import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Profile } from "@/lib/auth";
import { recipeLineCost } from "@/lib/recipeCost";
import { periodStartFor, isChecklistType, CHECKLIST_LABEL } from "@/app/(app)/checklists/shared/lib";

// Franz only ever reads — every query below runs through the caller's own
// authenticated Supabase client, so RLS (outlet scoping, role visibility)
// applies exactly as it would if the user browsed the page themselves. No
// tool here writes, and none should be added without also re-checking the
// permission story in the system prompt.

export const FRANZ_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_inventory_status",
    description:
      "Zeigt den aktuellen Lagerbestand von Artikeln im Inventar, verglichen mit dem Sollbestand (Einheit, Bestand, Soll). Optional nach Kategorie filtern oder nur Artikel unter Sollbestand anzeigen.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Optionaler Filter: spirits, beer, wine, mixer, garnish, herbs_produce, juice, liqueur, schnapps, syrup, bitters, consumable",
        },
        low_stock_only: {
          type: "boolean",
          description: "Nur Artikel anzeigen, deren Bestand unter dem Sollbestand liegt",
        },
      },
    },
  },
  {
    name: "get_menu_item_cost",
    description:
      "Sucht einen Cocktail/Menüpunkt nach Namen und gibt Verkaufspreis, Zutatenkosten und Marge zurück.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name oder Teil des Namens des Menüpunkts" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_wine_info",
    description:
      "Sucht einen Wein im Inventar (Kategorie Wein) nach Namen und gibt Weinart, Bestand und die hinterlegte Beschreibung (Geschichte, Rebsorte/Region, Speisenempfehlung) zurück.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name oder Teil des Namens des Weins" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_checklist_status",
    description:
      "Zeigt den Status der eigenen aktuellen Checkliste (Opening, Closing, Wochencheck oder Monatscheck) — wie viele Punkte bereits erledigt sind und ob der Bericht schon eingereicht wurde.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["opening", "closing", "weekly", "monthly"],
          description: "Welche Checkliste",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "search_handbook",
    description:
      "Durchsucht das Handbuch (Anleitungen, Rezepte, Hausregeln) nach einem Stichwort im Titel oder Text.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Suchbegriff" },
      },
      required: ["query"],
    },
  },
];

type Supabase = SupabaseClient<Database>;

export async function runFranzTool(supabase: Supabase, profile: Profile, name: string, input: unknown): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "get_inventory_status":
      return getInventoryStatus(supabase, args);
    case "get_menu_item_cost":
      return getMenuItemCost(supabase, args);
    case "get_wine_info":
      return getWineInfo(supabase, args);
    case "get_checklist_status":
      return getChecklistStatus(supabase, profile, args);
    case "search_handbook":
      return searchHandbook(supabase, args);
    default:
      return `Unbekanntes Tool: ${name}`;
  }
}

async function getInventoryStatus(supabase: Supabase, args: Record<string, unknown>): Promise<string> {
  const category = typeof args.category === "string" ? args.category : undefined;
  const lowStockOnly = args.low_stock_only === true;

  let query = supabase
    .from("inventory_items")
    .select("name, category, unit, current_stock, par_level")
    .order("name")
    .limit(80);
  if (category) query = query.eq("category", category as never);

  const { data, error } = await query;
  if (error) return `Fehler beim Lesen des Inventars: ${error.message}`;

  let items = data ?? [];
  if (lowStockOnly) items = items.filter((i) => i.current_stock < i.par_level);
  if (items.length === 0) return "Keine passenden Artikel gefunden.";

  const lines = items.map(
    (i) =>
      `${i.name} (${i.category}): ${i.current_stock} ${i.unit} von ${i.par_level} ${i.unit} Soll${
        i.current_stock < i.par_level ? " — UNTER SOLLBESTAND" : ""
      }`,
  );
  return lines.join("\n");
}

async function getMenuItemCost(supabase: Supabase, args: Record<string, unknown>): Promise<string> {
  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) return "Bitte einen Namen angeben.";

  const { data: menuItems, error } = await supabase
    .from("menu_items")
    .select("id, name, sale_price")
    .ilike("name", `%${name}%`)
    .limit(5);
  if (error) return `Fehler bei der Suche: ${error.message}`;
  if (!menuItems || menuItems.length === 0) return `Kein Menüpunkt gefunden, der zu "${name}" passt.`;

  const results = await Promise.all(
    menuItems.map(async (m) => {
      const { data: recipes } = await supabase
        .from("recipes")
        .select("amount, inventory_items(unit_volume_ml, purchase_price)")
        .eq("menu_item_id", m.id);
      const cost = (recipes ?? []).reduce((sum, r) => {
        const item = r.inventory_items as unknown as { unit_volume_ml: number | null; purchase_price: number | null } | null;
        return sum + recipeLineCost(r.amount, item);
      }, 0);
      const margin = m.sale_price - cost;
      const marginPct = m.sale_price > 0 ? (margin / m.sale_price) * 100 : 0;
      return `${m.name}: Verkaufspreis ${m.sale_price.toFixed(2)} €, Zutatenkosten ${cost.toFixed(2)} €, Marge ${margin.toFixed(2)} € (${marginPct.toFixed(0)}%)`;
    }),
  );
  return results.join("\n");
}

async function getWineInfo(supabase: Supabase, args: Record<string, unknown>): Promise<string> {
  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) return "Bitte einen Namen angeben.";

  const { data, error } = await supabase
    .from("inventory_items")
    .select("name, wine_type, current_stock, unit, description")
    .eq("category", "wine")
    .ilike("name", `%${name}%`)
    .limit(5);
  if (error) return `Fehler bei der Suche: ${error.message}`;
  if (!data || data.length === 0) return `Kein Wein gefunden, der zu "${name}" passt.`;

  return data
    .map((w) => {
      const parts = [`${w.name} (${w.wine_type ?? "Typ unbekannt"}): ${w.current_stock} ${w.unit} auf Lager.`];
      parts.push(w.description ? w.description : "Keine Beschreibung hinterlegt.");
      return parts.join(" ");
    })
    .join("\n\n");
}

async function getChecklistStatus(supabase: Supabase, profile: Profile, args: Record<string, unknown>): Promise<string> {
  const type = typeof args.type === "string" ? args.type : "";
  if (!isChecklistType(type)) return "Ungültiger Checklisten-Typ.";
  if (!profile.outlet_id) return "Kein Standort zugeordnet.";

  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("id, items")
    .eq("outlet_id", profile.outlet_id)
    .eq("name", type)
    .order("created_at", { ascending: true })
    .limit(1);
  const template = templates?.[0];
  if (!template) return `Für ${CHECKLIST_LABEL[type]} ist noch keine Vorlage angelegt.`;

  const periodStart = periodStartFor(type);
  // Read-only on purpose — this tool must never create a draft submission
  // just because someone asked Franz about it.
  const { data: submissions } = await supabase
    .from("checklist_submissions")
    .select("id, status, submitted_at")
    .eq("template_id", template.id)
    .eq("user_id", profile.id)
    .eq("period_start", periodStart)
    .order("created_at", { ascending: true })
    .limit(1);
  const submission = submissions?.[0];
  const totalItems = (template.items as unknown[]).length;

  if (!submission) {
    return `${CHECKLIST_LABEL[type]}: noch nicht begonnen (${totalItems} Punkte insgesamt).`;
  }

  const { count } = await supabase
    .from("checklist_item_results")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submission.id)
    .eq("checked", true);

  const statusLabel = submission.status === "draft" ? "in Bearbeitung" : submission.status === "submitted" ? "eingereicht" : "freigegeben";
  return `${CHECKLIST_LABEL[type]}: ${count ?? 0} von ${totalItems} Punkten erledigt, Status: ${statusLabel}.`;
}

async function searchHandbook(supabase: Supabase, args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return "Bitte einen Suchbegriff angeben.";

  const { data, error } = await supabase
    .from("handbook_sections")
    .select("title, body, category")
    .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
    .limit(5);
  if (error) return `Fehler bei der Suche: ${error.message}`;
  if (!data || data.length === 0) return `Nichts im Handbuch zu "${query}" gefunden.`;

  return data.map((s) => `[${s.category}] ${s.title}\n${s.body}`).join("\n\n---\n\n");
}
