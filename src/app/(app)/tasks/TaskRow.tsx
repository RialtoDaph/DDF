"use client";

import { useTransition } from "react";
import { setTaskStatus } from "./actions";
import { StampBadge } from "@/components/ui/StampBadge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/database.types";

export function TaskRow({
  task,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    due_date: string | null;
    recurrence: string;
    assignee_name?: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const done = task.status === "done";

  function toggle() {
    startTransition(() => setTaskStatus(task.id, done ? "open" : "done"));
  }

  const overdue = !done && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0 rounded border flex items-center justify-center transition-colors",
          done ? "bg-done border-done" : "border-ink-border hover:border-brass",
        )}
      >
        {done && <span className="text-ink text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", done ? "text-parchment-dim line-through" : "text-parchment")}>{task.title}</p>
        {task.description && <p className="text-xs text-parchment-dim mt-0.5">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.assignee_name && <span className="text-xs text-brass-soft">{task.assignee_name}</span>}
          {task.due_date && (
            <span className={cn("tabular text-xs", overdue ? "text-warn" : "text-parchment-dim")}>
              {task.due_date.split("-").reverse().join(".")}
            </span>
          )}
          {task.recurrence !== "none" && (
            <span className="text-xs text-parchment-dim">
              · {task.recurrence === "daily" ? "taeglich" : "woechentlich"}
            </span>
          )}
        </div>
      </div>
      {done && <StampBadge>Erledigt</StampBadge>}
    </li>
  );
}
