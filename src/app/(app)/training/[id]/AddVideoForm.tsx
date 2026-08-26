"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attachModuleVideo } from "../actions";
import { isValidVideoLink } from "../shared/driveVideo";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AddVideoForm({ moduleId, onDone }: { moduleId: string; onDone?: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!isValidVideoLink(trimmed)) {
      setError("Bitte einen gültigen Video-Link angeben.");
      return;
    }

    setBusy(true);
    const result = await attachModuleVideo(moduleId, trimmed);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor={`video-url-${moduleId}`}>Video-Link (Google Drive)</Label>
        <Input
          id={`video-url-${moduleId}`}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/…/view"
          required
        />
        <p className="text-xs text-parchment-dim mt-1">
          Video in Google Drive hochladen, Freigabe auf &quot;Jeder mit dem Link&quot; stellen, Link hier einfügen.
        </p>
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      <Button type="submit" variant="secondary" disabled={busy}>
        {busy ? "Wird gespeichert…" : "Video verknüpfen"}
      </Button>
    </form>
  );
}
