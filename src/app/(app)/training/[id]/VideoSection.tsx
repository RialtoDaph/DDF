"use client";

import { useState, useTransition } from "react";
import { removeModuleVideo } from "../actions";
import { AddVideoForm } from "./AddVideoForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function VideoSection({
  moduleId,
  videoUrl,
  videoEmbedUrl,
  canManage,
}: {
  moduleId: string;
  videoUrl: string | null;
  videoEmbedUrl: string | null;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!window.confirm("Video wirklich entfernen?")) return;
    setError(null);
    startTransition(async () => {
      const res = await removeModuleVideo(moduleId);
      if (res?.error) setError(res.error);
    });
  }

  if (!canManage && !videoUrl) return null;

  if (!videoUrl || editing) {
    return (
      <Card>
        <CardHeader title="Video hinzufügen" />
        <AddVideoForm moduleId={moduleId} onDone={() => setEditing(false)} />
        {videoUrl && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="mt-2">
            Abbrechen
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card>
      {/* Height rather than a fixed aspect ratio — a Drive embed doesn't
          expose the source video's real orientation, and most clips here are
          phone-shot portrait; a locked 16:9 box would pillarbox those down
          to a sliver. A tall box lets Drive's own player fit either
          orientation without wasting as much space. */}
      {videoEmbedUrl ? (
        <iframe
          src={videoEmbedUrl}
          allow="autoplay"
          allowFullScreen
          className="w-full h-[70vh] max-h-[640px] rounded-md border-0"
        />
      ) : (
        <video src={videoUrl} controls className="mx-auto block max-h-[60vh] w-auto max-w-full rounded-md" />
      )}
      {canManage && (
        <div className="flex items-center gap-2 mt-3">
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            Video ändern
          </Button>
          <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
            Video entfernen
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-warn mt-1">{error}</p>}
    </Card>
  );
}
