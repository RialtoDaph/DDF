import { Card, CardHeader } from "@/components/ui/Card";
import { ItemRow } from "./ItemRow";
import { ROUND_CHECK_CATEGORIES, ROUND_CHECK_LABEL } from "./lib";
import type { ChecklistTemplateItem } from "@/lib/database.types";

export interface ItemResultMap {
  [itemText: string]: { checked: boolean; photo_url: string | null; photo_taken_at: string | null };
}

export function ChecklistSections({
  submissionId,
  items,
  results,
  readOnly,
  includeRoundCheck,
}: {
  submissionId: string;
  items: ChecklistTemplateItem[];
  results: ItemResultMap;
  readOnly: boolean;
  includeRoundCheck: boolean;
}) {
  const general = items.filter((i) => !ROUND_CHECK_CATEGORIES.includes(i.category as never));
  const roundCheck = ROUND_CHECK_CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Checkliste" />
        <ul className="divide-y divide-ink-border">
          {general.map((item) => (
            <ItemRow
              key={item.text}
              submissionId={submissionId}
              item={item}
              initialChecked={results[item.text]?.checked ?? false}
              initialPhotoUrl={results[item.text]?.photo_url ?? null}
              initialTakenAt={results[item.text]?.photo_taken_at ?? null}
              readOnly={readOnly}
            />
          ))}
        </ul>
      </Card>

      {includeRoundCheck && roundCheck.length > 0 && (
        <Card>
          <CardHeader title="Round Check" subtitle="Abschliessender Kontrollgang" />
          <div className="space-y-5">
            {roundCheck.map((group) => (
              <div key={group.category}>
                <p className="text-xs uppercase tracking-wide text-wine-soft mb-1">
                  {ROUND_CHECK_LABEL[group.category] ?? group.category}
                </p>
                <ul className="divide-y divide-ink-border">
                  {group.items.map((item) => (
                    <ItemRow
                      key={item.text}
                      submissionId={submissionId}
                      item={item}
                      initialChecked={results[item.text]?.checked ?? false}
                      initialPhotoUrl={results[item.text]?.photo_url ?? null}
                      initialTakenAt={results[item.text]?.photo_taken_at ?? null}
                      readOnly={readOnly}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
