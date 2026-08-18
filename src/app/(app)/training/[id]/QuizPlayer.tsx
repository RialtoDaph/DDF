"use client";

import { useState, useTransition } from "react";
import { submitQuiz } from "../actions";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StampBadge } from "@/components/ui/StampBadge";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  type: "multiple_choice" | "short_answer";
  options: string[] | null;
}

export function QuizPlayer({ moduleId, questions }: { moduleId: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = questions.every((q) => (answers[q.id] ?? "").trim().length > 0);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz(moduleId, answers);
      if (res.error) {
        setError(res.error);
      } else {
        setResult({ score: res.score, passed: res.passed });
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-2">
        <StampBadge variant={result.passed ? "done" : "warn"}>
          {result.passed ? "Bestanden" : "Nicht bestanden"} — {result.score}%
        </StampBadge>
        {!result.passed && (
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
          >
            Erneut versuchen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, idx) => (
        <div key={q.id}>
          <p className="text-sm text-parchment mb-2">
            {idx + 1}. {q.question}
          </p>
          {q.type === "multiple_choice" && q.options ? (
            <div className="space-y-1.5">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-parchment-dim">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    className="accent-wine"
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <Input
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Antwort…"
            />
          )}
        </div>
      ))}
      {error && <p className="text-sm text-warn">{error}</p>}
      <Button onClick={handleSubmit} disabled={!allAnswered || pending} className={cn("w-full")}>
        {pending ? "Wird ausgewertet…" : "Quiz abschicken"}
      </Button>
    </div>
  );
}
