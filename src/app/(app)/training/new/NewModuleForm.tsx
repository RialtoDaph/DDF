"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createModuleRecord, attachModuleVideo } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { MAX_VIDEO_BYTES, videoTooLargeMessage, uploadTrainingVideo } from "../shared/videoUpload";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewModuleForm({ menuItems }: { menuItems: { id: string; name: string }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Wird gespeichert…");
  const fileRef = useRef<HTMLInputElement>(null);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);

    // Check up front so a too-large video is caught before the module row
    // is even created, instead of failing partway through with an
    // orphaned module.
    const video = fileRef.current?.files?.[0];
    if (video && video.size > MAX_VIDEO_BYTES) {
      setError(videoTooLargeMessage(video.size));
      return;
    }

    setBusy(true);
    setBusyLabel("Wird gespeichert…");

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

    if (video && video.size > 0) {
      setBusyLabel("Video wird hochgeladen…");
      const uploadResult = await uploadTrainingVideo(supabase, result.id, video);
      if (uploadResult.error || !uploadResult.path) {
        setError(uploadResult.error ?? "Unbekannter Fehler beim Hochladen.");
        setBusy(false);
        return;
      }

      const attachResult = await attachModuleVideo(result.id, uploadResult.path);
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
        <Label htmlFor="video">Video (max. 50 MB)</Label>
        <input
          ref={fileRef}
          id="video"
          name="video"
          type="file"
          accept="video/*"
          className="block w-full text-sm text-parchment-dim file:mr-3 file:rounded-md file:border-0 file:bg-wine file:px-3 file:py-2 file:text-ink file:text-sm"
        />
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? busyLabel : "Modul anlegen"}
      </Button>
    </form>
  );
}
