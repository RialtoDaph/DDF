import { Card, CardHeader } from "@/components/ui/Card";
import { ItemRow, type ItemPhoto } from "./ItemRow";
import { ROUND_CHECK_CATEGORIES, ROUND_CHECK_LABEL } from "./lib";
import type { ChecklistTemplateItem, ChecklistType } from "@/lib/database.types";

export interface ItemResultMap {
  [itemText: string]: { checked: boolean; photos: ItemPhoto[] };
}

export function ChecklistSections({
  submissionId,
  type,
  items,
  results,
  readOnly,
  includeRoundCheck,
  title,
  subtitle,
  right,
}: {
  submissionId: string;
  type: ChecklistType;
  items: ChecklistTemplateItem[];
  results: ItemResultMap;
  readOnly: boolean;
  includeRoundCheck: boolean;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const general = items.filter((i) => !ROUND_CHECK_CATEGORIES.includes(i.category as never));
  const roundCheck = ROUND_CHECK_CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-[var(--sp-lg)]">
      <Card>
        <CardHeader title={title} subtitle={subtitle} right={right} />
        <ul className="divide-y divide-ink-border">
          {general.map((item) => (
            <ItemRow
              key={item.text}
              submissionId={submissionId}
              type={type}
              item={item}
              initialChecked={results[item.text]?.checked ?? false}
              initialPhotos={results[item.text]?.photos ?? []}
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
                      type={type}
                      item={item}
                      initialChecked={results[item.text]?.checked ?? false}
                      initialPhotos={results[item.text]?.photos ?? []}
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
