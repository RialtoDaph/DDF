"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createModuleRecord, attachModuleVideo } from "../actions";
import { createClient } from "@/lib/supabase/client";
import {
  uploadTrainingVideo,
  uploadProgressLabel,
  cancelTrainingVideoUpload,
  MAX_SOURCE_BYTES,
  videoTooLargeForCompressionMessage,
} from "../shared/videoUpload";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewModuleForm({ menuItems }: { menuItems: { id: string; name: string }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Wird gespeichert…");
  const fileRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);

    // Check up front so a video that could never succeed (even after
    // compression) is caught before the module row is even created,
    // instead of failing partway through with an orphaned module.
    const video = fileRef.current?.files?.[0];
    if (video && video.size > MAX_SOURCE_BYTES) {
      setError(videoTooLargeForCompressionMessage(video.size));
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
      const controller = new AbortController();
      controllerRef.current = controller;

      const uploadResult = await uploadTrainingVideo(
        supabase,
        result.id,
        video,
        (phase, ratio) => setBusyLabel(uploadProgressLabel(phase, ratio, "Video wird hochgeladen…")),
        controller.signal,
      );
      controllerRef.current = null;
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

  function handleCancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    cancelTrainingVideoUpload();
    setBusy(false);
    setError("Hochladen abgebrochen.");
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
        <Label htmlFor="video">Video</Label>
        <input
          ref={fileRef}
          id="video"
          name="video"
          type="file"
          accept="video/*"
          className="block w-full text-sm text-parchment-dim file:mr-3 file:rounded-md file:border-0 file:bg-wine file:px-3 file:py-2 file:text-ink file:text-sm"
        />
        <p className="text-xs text-parchment-dim mt-1">
          Videos über 50 MB werden vor dem Hochladen automatisch komprimiert.
        </p>
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? busyLabel : "Modul anlegen"}
        </Button>
        {busy && (
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  );
}
