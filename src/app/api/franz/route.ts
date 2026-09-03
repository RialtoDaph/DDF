import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";
import { toolsForRole, runFranzTool } from "@/lib/franz/tools";
import { buildSystemPrompt } from "@/lib/franz/systemPrompt";

export const runtime = "nodejs";

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 6;
const MODEL = "claude-haiku-4-5";

export async function POST(request: NextRequest) {
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
  if (!profile || !profile.is_active) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const userMessage = typeof body?.message === "string" ? body.message.trim() : "";
  if (!userMessage) return NextResponse.json({ error: "Nachricht fehlt." }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Franz ist noch nicht eingerichtet (ANTHROPIC_API_KEY fehlt)." }, { status: 503 });
  }

  const typedProfile = profile as Profile;

  const { error: insertError } = await supabase
    .from("franz_messages")
    .insert({ user_id: typedProfile.id, outlet_id: typedProfile.outlet_id, role: "user", content: userMessage });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { data: historyRows } = await supabase
    .from("franz_messages")
    .select("role, content")
    .eq("user_id", typedProfile.id)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  const messages: Anthropic.MessageParam[] = (historyRows ?? [])
    .slice()
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  const client = new Anthropic();
  const tools = toolsForRole(typedProfile);
  const ctx = { supabase, profile: typedProfile };

  let finalText = "";

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(typedProfile),
        tools,
        messages,
      });

      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const tool of toolUseBlocks) {
          const result = await runFranzTool(tool.name, tool.input as Record<string, unknown>, ctx);
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result });
        }
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      finalText = textBlock?.text ?? "";
      break;
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Franz-API-Schlüssel ist ungültig." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Franz ist gerade überlastet, versuch's gleich nochmal." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "Franz hat gerade ein Problem." }, { status: 502 });
    }
    throw error;
  }

  if (!finalText) finalText = "Sorry, da ist gerade was schiefgelaufen. Versuch's nochmal.";

  await supabase
    .from("franz_messages")
    .insert({ user_id: typedProfile.id, outlet_id: typedProfile.outlet_id, role: "assistant", content: finalText });

  return NextResponse.json({ reply: finalText });
}
