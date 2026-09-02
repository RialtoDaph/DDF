import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { FRANZ_TOOLS, runFranzTool } from "@/lib/franz/tools";
import type { Profile } from "@/lib/auth";

export const maxDuration = 60;

// A tool-use loop iteration is a real API call, so this caps worst-case
// latency/cost if Claude keeps calling tools instead of answering — a bug
// in a tool's return value should not turn into an unbounded request chain.
const MAX_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 20;

function systemPrompt(profile: Profile): string {
  return [
    "Du bist Franz, der digitale Assistent der Bar \"Der Dicke Franz\". Du hilfst dem Team während der Schicht mit schnellen, konkreten Antworten.",
    `Angemeldet ist ${profile.name} (Rolle: ${profile.role}).`,
    "Du hast nur lesenden Zugriff über deine Tools — du kannst nichts in der App ändern, speichern oder abhaken. Wenn jemand dich bittet, etwas einzutragen oder zu erledigen, erkläre freundlich, dass du das (noch) nicht kannst, und sag, wo man es selbst einträgt.",
    "Nutze die Tools für alles Faktische (Bestand, Preise, Kosten, Checklisten-Status, Handbuch) — errate niemals Zahlen oder Inhalte. Wenn ein Tool nichts findet, sag das ehrlich, statt zu spekulieren.",
    "Antworte in der Sprache, in der die Frage gestellt wurde. Halte Antworten kurz und konkret — das Team liest das während einer Schicht, nicht in Ruhe.",
  ].join("\n\n");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, outlet_id, email, is_active")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Franz ist noch nicht eingerichtet (fehlender API-Key)." }, { status: 503 });
  }

  const body: unknown = await req.json().catch(() => null);
  const rawMessages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "Keine Nachricht übermittelt." }, { status: 400 });
  }

  function isFranzTurn(m: unknown): m is { role: "user" | "assistant"; content: string } {
    const r = m as { role?: unknown; content?: unknown };
    return (r.role === "user" || r.role === "assistant") && typeof r.content === "string" && r.content.trim().length > 0;
  }

  const history = (rawMessages as unknown[]).filter(isFranzTurn).slice(-MAX_HISTORY_MESSAGES);

  if (history.length === 0) {
    return NextResponse.json({ error: "Keine gültige Nachricht übermittelt." }, { status: 400 });
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 2048,
        system: systemPrompt(profile),
        tools: FRANZ_TOOLS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
        return NextResponse.json({ reply: text || "…" });
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (t) => {
          try {
            const content = await runFranzTool(supabase, profile, t.name, t.input);
            return { type: "tool_result" as const, tool_use_id: t.id, content };
          } catch (err) {
            return {
              type: "tool_result" as const,
              tool_use_id: t.id,
              content: err instanceof Error ? err.message : "Unbekannter Fehler.",
              is_error: true,
            };
          }
        }),
      );
      messages.push({ role: "user", content: results });
    }

    return NextResponse.json({
      reply: "Entschuldigung, das dauert gerade zu lange. Bitte versuch's nochmal oder frag etwas konkreter.",
    });
  } catch (err) {
    console.error("Franz API error", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Franz ist noch nicht eingerichtet (ungültiger API-Key)." }, { status: 503 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Franz ist gerade überlastet. Bitte kurz warten und erneut versuchen." }, { status: 429 });
    }
    return NextResponse.json({ error: "Franz hat gerade ein Problem. Bitte später erneut versuchen." }, { status: 500 });
  }
}
