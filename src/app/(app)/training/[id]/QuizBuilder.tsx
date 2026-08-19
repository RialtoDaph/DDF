"use client";

import { useActionState, useState, useTransition } from "react";
import { addQuizQuestion, removeQuizQuestion } from "../actions";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";
import { X } from "lucide-react";
import type { QuizQuestionType } from "@/lib/database.types";

interface QuizQuestionRow {
  id: string;
  question: string;
  type: QuizQuestionType;
  options: string[] | null;
  correct_answer: string;
}

export function QuizBuilder({ moduleId, questions }: { moduleId: string; questions: QuizQuestionRow[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addQuizQuestion, initialActionState);
  const [type, setType] = useState<QuizQuestionType>("multiple_choice");
  const [, startTransition] = useTransition();
  const [prevSuccess, setPrevSuccess] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Clear the form (remount it via key) once a question is saved, so the
  // uncontrolled question/answer fields don't sit there looking unsaved.
  if (state.success && !prevSuccess) {
    setPrevSuccess(true);
    setType("multiple_choice");
    setResetKey((k) => k + 1);
  } else if (!state.success && prevSuccess) {
    setPrevSuccess(false);
  }

  return (
    <div className="space-y-4">
      {questions.length > 0 && (
        <ul className="divide-y divide-ink-border">
          {questions.map((q) => (
            <li key={q.id} className="py-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-parchment">{q.question}</p>
                  <p className="text-xs text-parchment-dim mt-0.5">
                    Richtige Antwort: <span className="text-wine-soft">{q.correct_answer}</span>
                    {q.options && q.options.length > 0 ? ` · Optionen: ${q.options.join(", ")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startTransition(() => removeQuizQuestion(q.id, moduleId))}
                  aria-label="Frage entfernen"
                  className="text-parchment-dim hover:text-warn shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form key={resetKey} action={formAction} className="space-y-3 pt-2 border-t border-ink-border">
        <input type="hidden" name="training_module_id" value={moduleId} />
        <div>
          <Label htmlFor="question">Frage</Label>
          <Input id="question" name="question" required />
        </div>
        <div>
          <Label htmlFor="type">Typ</Label>
          <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as QuizQuestionType)}>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="short_answer">Kurzantwort</option>
          </Select>
        </div>
        {type === "multiple_choice" && (
          <div>
            <Label htmlFor="options">Optionen (eine pro Zeile)</Label>
            <Textarea id="options" name="options" rows={3} placeholder={"Option A\nOption B\nOption C"} />
          </div>
        )}
        <div>
          <Label htmlFor="correct_answer">Richtige Antwort</Label>
          <Input id="correct_answer" name="correct_answer" required placeholder="Muss exakt einer Option / Kurzantwort entsprechen" />
        </div>
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Frage hinzufügen"}
        </Button>
      </form>
    </div>
  );
}
