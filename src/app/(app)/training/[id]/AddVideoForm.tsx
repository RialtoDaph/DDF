"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { attachModuleVideo } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { uploadTrainingVideo, uploadProgressLabel } from "../shared/videoUpload";
import { Button } from "@/components/ui/Button";

export function AddVideoForm({ moduleId }: { moduleId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Wird hochgeladen…");
  const fileRef = useRef<HTMLInputElement>(null);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const video = fileRef.current?.files?.[0];
    if (!video) {
      setError("Bitte ein Video auswählen.");
      return;
    }

    setBusy(true);
    setBusyLabel("Wird hochgeladen…");

    const uploadResult = await uploadTrainingVideo(supabase, moduleId, video, (phase, ratio) =>
      setBusyLabel(uploadProgressLabel(phase, ratio, "Wird hochgeladen…")),
    );
    if (uploadResult.error || !uploadResult.path) {
      setError(uploadResult.error ?? "Unbekannter Fehler beim Hochladen.");
      setBusy(false);
      return;
    }

    const attachResult = await attachModuleVideo(moduleId, uploadResult.path);
    if (attachResult.error) {
      setError(attachResult.error);
      setBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="block w-full text-sm text-parchment-dim file:mr-3 file:rounded-md file:border-0 file:bg-wine file:px-3 file:py-2 file:text-ink file:text-sm"
      />
      <p className="text-xs text-parchment-dim">Videos über 50 MB werden vor dem Hochladen automatisch komprimiert.</p>
      {error && <p className="text-sm text-warn">{error}</p>}
      <Button type="submit" variant="secondary" disabled={busy}>
        {busy ? busyLabel : "Video hochladen"}
      </Button>
    </form>
  );
}
