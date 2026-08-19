"use client";

import { useActionState, useState, useTransition } from "react";
import { setTaskStatus, updateTask, deleteTask } from "./actions";
import { StampBadge } from "@/components/ui/StampBadge";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/database.types";

export function TaskRow({
  task,
  users,
  canEdit,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    due_date: string | null;
    recurrence: string;
    assigned_to: string | null;
    assignee_name?: string | null;
  };
  users: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [state, formAction, savePending] = useActionState<ActionState, FormData>(updateTask, initialActionState);
  const [prevSuccess, setPrevSuccess] = useState(false);
  const done = task.status === "done";

  // Close the edit form once the save succeeds — the row re-renders from
  // revalidatePath with the updated data underneath.
  if (state.success && !prevSuccess) {
    setPrevSuccess(true);
    setEditing(false);
  } else if (!state.success && prevSuccess) {
    setPrevSuccess(false);
  }

  function toggle() {
    startTransition(() => setTaskStatus(task.id, done ? "open" : "done"));
  }

  function remove() {
    if (!window.confirm(`"${task.title}" wirklich loeschen?`)) return;
    startTransition(() => {
      deleteTask(task.id);
    });
  }

  const overdue = !done && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());

  if (editing) {
    return (
      <li className="py-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={task.id} />
          <div>
            <Label htmlFor={`title-${task.id}`}>Titel</Label>
            <Input id={`title-${task.id}`} name="title" defaultValue={task.title} required />
          </div>
          <div>
            <Label htmlFor={`description-${task.id}`}>Beschreibung</Label>
            <Textarea
              id={`description-${task.id}`}
              name="description"
              defaultValue={task.description ?? ""}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`assigned_to-${task.id}`}>Zugewiesen an</Label>
              <Select id={`assigned_to-${task.id}`} name="assigned_to" defaultValue={task.assigned_to ?? ""}>
                <option value="">— offen —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`due_date-${task.id}`}>Faellig am</Label>
              <Input id={`due_date-${task.id}`} name="due_date" type="date" defaultValue={task.due_date ?? ""} />
            </div>
          </div>
          <div>
            <Label htmlFor={`recurrence-${task.id}`}>Wiederholung</Label>
            <Select id={`recurrence-${task.id}`} name="recurrence" defaultValue={task.recurrence}>
              <option value="none">Keine</option>
              <option value="daily">Taeglich</option>
              <option value="weekly">Woechentlich</option>
            </Select>
          </div>
          {state?.error && <p className="text-sm text-warn">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={savePending}>
              {savePending ? "Wird gespeichert…" : "Speichern"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0 rounded border flex items-center justify-center transition-colors",
          done ? "bg-done border-done" : "border-ink-border hover:border-wine",
        )}
      >
        {done && <span className="text-ink text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", done ? "text-parchment-dim line-through" : "text-parchment")}>{task.title}</p>
        {task.description && <p className="text-xs text-parchment-dim mt-0.5">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.assignee_name && <span className="text-xs text-wine-soft">{task.assignee_name}</span>}
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
      {canEdit && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            aria-label="Aufgabe bearbeiten"
            className="text-parchment-dim hover:text-wine p-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={remove}
            disabled={pending}
            aria-label="Aufgabe loeschen"
            className="text-parchment-dim hover:text-warn p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      {done && <StampBadge>Erledigt</StampBadge>}
    </li>
  );
}
