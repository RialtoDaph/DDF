"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { OrderItemRow } from "./OrderItemRow";
import type { OrderItemStatus } from "@/lib/database.types";

interface OrderListItem {
  id: string;
  item_name: string;
  quantity: string | null;
  supplier_name: string | null;
  notes: string | null;
  status: OrderItemStatus;
}

const NO_SUPPLIER = "__none__";

export function OrderList({ items }: { items: OrderListItem[] }) {
  const [supplierFilter, setSupplierFilter] = useState("");

  const { supplierNames, hasUnassigned } = useMemo(() => {
    const names = new Set<string>();
    let unassigned = false;
    for (const i of items) {
      if (i.supplier_name) names.add(i.supplier_name);
      else unassigned = true;
    }
    return { supplierNames: Array.from(names).sort((a, b) => a.localeCompare(b, "de")), hasUnassigned: unassigned };
  }, [items]);

  const filtered = items.filter((i) => {
    if (!supplierFilter) return true;
    if (supplierFilter === NO_SUPPLIER) return !i.supplier_name;
    return i.supplier_name === supplierFilter;
  });

  const open = filtered.filter((i) => i.status !== "ordered");
  const ordered = filtered.filter((i) => i.status === "ordered");

  return (
    <>
      {(supplierNames.length > 0 || hasUnassigned) && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-parchment-dim">Lieferant</span>
          <Select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-56"
            aria-label="Nach Lieferant filtern"
          >
            <option value="">Alle Lieferanten</option>
            {supplierNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {hasUnassigned && <option value={NO_SUPPLIER}>Ohne Lieferant</option>}
          </Select>
        </div>
      )}

      <Card>
        <CardHeader title="Offen" />
        {open.length === 0 ? (
          <p className="text-sm text-parchment-dim">Nichts offen.</p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {open.map((item) => (
              <OrderItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </Card>

      {ordered.length > 0 && (
        <Card>
          <CardHeader title="Bestellt" />
          <ul className="divide-y divide-ink-border">
            {ordered.slice(0, 20).map((item) => (
              <OrderItemRow key={item.id} item={item} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
