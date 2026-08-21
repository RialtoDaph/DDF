"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createModuleRecord, attachModuleVideo } from "../actions";
import { isValidVideoLink } from "../shared/driveVideo";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewModuleForm({ menuItems }: { menuItems: { id: string; name: string }[] }) {
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);

    const trimmedVideoUrl = videoUrl.trim();
    if (trimmedVideoUrl && !isValidVideoLink(trimmedVideoUrl)) {
      setError("Bitte einen gültigen Video-Link angeben.");
      return;
    }

    setBusy(true);

    const textData = new FormData();
    textData.set("title", (form.elements.namedItem("title") as HTMLInputElement).value);
    textData.set("description", (form.elements.namedItem("description") as HTMLTextAreaElement).value);
    textData.set("menu_item_id", (form.elements.namedItem("menu_item_id") as HTMLSelectElement).value);

    const result = await createModuleRecord(undefined, textData);
    if (result.error || !result.id) {
      setError(result.error ?? "Unbekannter Fehler.");
      setBusy(false);
      return;
    }

    if (trimmedVideoUrl) {
      const attachResult = await attachModuleVideo(result.id, trimmedVideoUrl);
      if (attachResult.error) {
        setError(attachResult.error);
        setBusy(false);
        return;
      }
    }

    router.push(`/training/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required placeholder="z. B. Old Fashioned zubereiten" />
      </div>
      <div>
        <Label htmlFor="menu_item_id">Verknüpfter Menüpunkt</Label>
        <Select id="menu_item_id" name="menu_item_id" defaultValue="">
          <option value="">— optional —</option>
          {menuItems.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div>
        <Label htmlFor="video-url">Video-Link (Google Drive)</Label>
        <Input
          id="video-url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/…/view"
        />
        <p className="text-xs text-parchment-dim mt-1">
          Optional. Video in Google Drive hochladen, Freigabe auf &quot;Jeder mit dem Link&quot; stellen, Link hier
          einfügen. Kann auch später hinzugefügt werden.
        </p>
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      <Button type="submit" disabled={busy} className="flex-1">
        {busy ? "Wird gespeichert…" : "Modul anlegen"}
      </Button>
    </form>
  );
}
