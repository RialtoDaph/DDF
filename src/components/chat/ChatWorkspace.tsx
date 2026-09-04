"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, Hash, Building2, ShieldCheck, X, Trash2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatTimestamp } from "@/lib/utils";
import type { ChatChannel, ChatMessage } from "@/lib/chat";
import { createChatChannel, deleteChatChannel, leaveChatChannel } from "@/app/(app)/chat/actions";

const lastSeenKey = (channelId: string) => `ddf-chat-lastseen-${channelId}`;

interface EligibleUser {
  id: string;
  name: string;
}

function channelSubtitle(channel: ChatChannel | undefined) {
  if (!channel) return "";
  if (channel.kind === "outlet") return "Standort-Kanal.";
  if (channel.kind === "management") return "Nur für Owner & Manager, standortübergreifend.";
  return "Gruppen-Kanal.";
}

export function ChatWorkspace({
  channels,
  initialChannelId,
  initialMessages,
  currentUserId,
  currentUserName,
  canCreateChannels,
  eligibleUsers,
}: {
  channels: ChatChannel[];
  initialChannelId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  canCreateChannels: boolean;
  eligibleUsers: EligibleUser[];
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [selectedId, setSelectedId] = useState(initialChannelId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedChannel = channels.find((c) => c.id === selectedId) ?? channels[0];

  // Reset the just-opened channel's unread count during render (React's
  // documented pattern for adjusting state on a prop/state change) rather
  // than in an effect, which would cause an extra cascading render.
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setUnreadByChannel((prev) => ({ ...prev, [selectedId]: 0 }));
  }

  // Marking "seen" in localStorage is a write to an external system, so it
  // belongs in an effect.
  useEffect(() => {
    localStorage.setItem(lastSeenKey(selectedId), new Date().toISOString());
  }, [selectedId]);

  // Skip the first run — those messages were already fetched server-side.
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    supabase
      .from("chat_messages")
      .select("id, channel_id, content, created_at, user_id, users(name)")
      .eq("channel_id", selectedId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? [])
          .map((m) => ({
            id: m.id,
            channel_id: m.channel_id,
            content: m.content,
            created_at: m.created_at,
            user_id: m.user_id,
            user_name: (m.users as unknown as { name: string } | null)?.name ?? "—",
          }))
          .reverse();
        setMessages(rows);
        setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, supabase]);

  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-workspace:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const row = payload.new as { id: string; channel_id: string; content: string; created_at: string; user_id: string };
          if (!channelsRef.current.some((c) => c.id === row.channel_id)) return;

          if (row.channel_id === selectedIdRef.current) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              const name = row.user_id === currentUserId ? currentUserName : prev.find((m) => m.user_id === row.user_id)?.user_name;
              return [...prev, { ...row, user_name: name ?? "…" }];
            });
            localStorage.setItem(lastSeenKey(row.channel_id), new Date().toISOString());

            if (row.user_id !== currentUserId) {
              const { data } = await supabase.from("users").select("name").eq("id", row.user_id).single();
              if (data) {
                setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, user_name: data.name } : m)));
              }
            }
          } else if (row.user_id !== currentUserId) {
            setUnreadByChannel((prev) => ({ ...prev, [row.channel_id]: (prev[row.channel_id] ?? 0) + 1 }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_channel_members", filter: `user_id=eq.${currentUserId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setSendError(null);
    const { error } = await supabase.from("chat_messages").insert({ channel_id: selectedId, user_id: currentUserId, content });
    setSending(false);
    if (error) {
      setSendError("Nachricht konnte nicht gesendet werden.");
    } else {
      setDraft("");
    }
  }

  async function handleLeave(channelId: string) {
    if (!confirm("Diesen Kanal verlassen?")) return;
    await leaveChatChannel(channelId);
    const fallback = channels.find((c) => c.id !== channelId);
    if (fallback) setSelectedId(fallback.id);
    router.refresh();
  }

  async function handleDelete(channelId: string) {
    if (!confirm("Kanal wirklich löschen? Alle Nachrichten gehen verloren.")) return;
    await deleteChatChannel(channelId);
    const fallback = channels.find((c) => c.id !== channelId);
    if (fallback) setSelectedId(fallback.id);
    router.refresh();
  }

  return (
    <div className="flex flex-1 min-h-0 w-full max-w-4xl mx-auto rounded-2xl border border-ink-border bg-ink-raised overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-ink-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-ink-border">
          <h1 className="font-serif text-lg text-parchment">Team-Chat</h1>
          {canCreateChannels && (
            <button
              onClick={() => setShowCreate(true)}
              aria-label="Neuer Kanal"
              className="p-1.5 rounded-md text-parchment-dim hover:text-parchment hover:bg-ink-card"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {channels.map((c) => {
            const Icon = c.kind === "outlet" ? Building2 : c.kind === "management" ? ShieldCheck : Hash;
            const active = c.id === selectedId;
            const unread = unreadByChannel[c.id] ?? 0;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors",
                  active
                    ? "bg-wine/15 text-wine border border-wine/30"
                    : "text-parchment-dim hover:text-parchment hover:bg-ink-card border border-transparent",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon size={15} strokeWidth={1.75} className="shrink-0" />
                  <span className="truncate">{c.name}</span>
                </span>
                {unread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[0.6rem] font-semibold text-ink shrink-0">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex items-center justify-between border-b border-ink-border px-5 py-4">
          <div>
            <h2 className="font-serif text-lg text-parchment">{selectedChannel?.name}</h2>
            <p className="text-xs text-parchment-dim mt-0.5">{channelSubtitle(selectedChannel)}</p>
          </div>
          {selectedChannel?.kind === "custom" &&
            (selectedChannel.created_by === currentUserId ? (
              <button
                onClick={() => handleDelete(selectedChannel.id)}
                aria-label="Kanal löschen"
                className="p-2 rounded-md text-parchment-dim hover:text-warn hover:bg-warn-soft"
              >
                <Trash2 size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleLeave(selectedChannel.id)}
                aria-label="Kanal verlassen"
                className="p-2 rounded-md text-parchment-dim hover:text-warn hover:bg-warn-soft"
              >
                <LogOut size={16} />
              </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-parchment-dim">
              {loadingMessages ? "Lädt…" : "Noch keine Nachrichten. Schreib die erste!"}
            </p>
          ) : (
            messages.map((m) => {
              const isOwn = m.user_id === currentUserId;
              return (
                <div key={m.id} className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
                  <span className="text-xs text-parchment-dim">
                    {m.user_name} · {formatTimestamp(m.created_at)}
                  </span>
                  <span
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
                      isOwn ? "bg-wine text-ink" : "bg-ink-card text-parchment",
                    )}
                  >
                    {m.content}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {sendError && <p className="px-5 pt-2 text-xs text-warn">{sendError}</p>}
        <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-ink-border px-4 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Nachricht an ${selectedChannel?.name ?? "das Team"}…`}
            className="flex-1 min-w-0 rounded-lg border border-ink-border bg-ink-card px-3.5 py-2.5 text-sm text-parchment placeholder:text-parchment-dim outline-none focus:border-wine"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Senden"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wine-deep text-parchment disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {showCreate && (
        <CreateChannelModal
          eligibleUsers={eligibleUsers}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setSelectedId(id);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function CreateChannelModal({
  eligibleUsers,
  onClose,
  onCreated,
}: {
  eligibleUsers: EligibleUser[];
  onClose: () => void;
  onCreated: (channelId: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createChatChannel(name.trim(), Array.from(selected));
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else if (result.channelId) {
      onCreated(result.channelId);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-ink-border bg-ink-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-border">
          <h3 className="font-serif text-lg text-parchment">Neuer Kanal</h3>
          <button onClick={onClose} aria-label="Schließen" className="p-1 text-parchment-dim hover:text-parchment">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-parchment-dim uppercase tracking-wide">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Küche"
              className="mt-1 w-full rounded-lg border border-ink-border bg-ink-card px-3.5 py-2.5 text-sm text-parchment placeholder:text-parchment-dim outline-none focus:border-wine"
            />
          </div>
          <div>
            <label className="text-xs text-parchment-dim uppercase tracking-wide">Mitglieder</label>
            <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-ink-border divide-y divide-ink-border">
              {eligibleUsers.length === 0 && <p className="px-3 py-2 text-sm text-parchment-dim">Keine Nutzer verfügbar.</p>}
              {eligibleUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm text-parchment cursor-pointer">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-warn">{error}</p>}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-wine-deep py-2.5 text-sm text-parchment disabled:opacity-40"
          >
            {saving ? "Erstellen…" : "Kanal erstellen"}
          </button>
        </form>
      </div>
    </div>
  );
}
