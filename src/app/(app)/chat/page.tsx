import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ChatWindow } from "./ChatWindow";

export default async function ChatPage() {
  const profile = await requireProfile();

  if (!profile.outlet_id) {
    return <Card>Kein Standort zugeordnet. Bitte an einen Owner wenden.</Card>;
  }

  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, content, created_at, user_id, users(name)")
    .eq("outlet_id", profile.outlet_id)
    .order("created_at", { ascending: true })
    .limit(200);

  const initialMessages = (messages ?? []).map((m) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    user_id: m.user_id,
    user_name: (m.users as unknown as { name: string } | null)?.name ?? "—",
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="font-serif text-2xl md:text-3xl text-parchment">Chat</h1>
        <p className="text-sm text-parchment-dim mt-1">Interner Kanal für deinen Standort.</p>
      </div>
      <ChatWindow
        outletId={profile.outlet_id}
        currentUserId={profile.id}
        currentUserName={profile.name}
        initialMessages={initialMessages}
      />
    </div>
  );
}
