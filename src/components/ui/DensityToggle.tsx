"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Density = "compact" | "comfortable";

const STORAGE_KEY = "ddf-density";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): Density {
  return localStorage.getItem(STORAGE_KEY) === "compact" ? "compact" : "comfortable";
}

function getServerSnapshot(): Density {
  return "comfortable";
}

export function DensityToggle() {
  const density = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setDensity(next: Density) {
    if (next === "compact") {
      document.documentElement.setAttribute("data-density", "compact");
    } else {
      document.documentElement.removeAttribute("data-density");
    }
    localStorage.setItem(STORAGE_KEY, next);
    // The native "storage" event only fires in *other* tabs — dispatch it
    // manually so this tab's useSyncExternalStore re-reads the new value.
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <div className="flex gap-0.5 rounded-lg bg-ink-card p-0.5">
      {(["compact", "comfortable"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => setDensity(d)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs transition-colors",
            density === d ? "bg-wine-deep text-parchment" : "text-parchment-dim hover:text-parchment",
          )}
        >
          {d === "compact" ? "Kompakt" : "Komfort"}
        </button>
      ))}
    </div>
  );
}
