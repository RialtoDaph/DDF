import { describe, it, expect } from "vitest";
import { buildStockTrend, sparkPoints } from "./lib";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("buildStockTrend", () => {
  it("returns a flat trend ending at currentStock when there are no movements", () => {
    const trend = buildStockTrend(10, []);
    expect(trend).toHaveLength(7);
    expect(trend[6]).toBe(10);
    expect(trend.every((v) => v === 10)).toBe(true);
  });

  it("walks real movements backward to reconstruct earlier stock levels", () => {
    // +5 in three days ago, -2 out yesterday; nothing recorded for today.
    const movements = [
      { type: "in" as const, quantity: 5, date: daysAgo(3) },
      { type: "out" as const, quantity: 2, date: daysAgo(1) },
    ];
    const trend = buildStockTrend(10, movements);
    // index 6 = today, 5 = yesterday, ... 0 = 6 days ago
    expect(trend[6]).toBe(10); // today
    expect(trend[5]).toBe(10); // yesterday (no movement dated "today" to undo)
    expect(trend[4]).toBe(12); // two days ago (undoing yesterday's -2)
    expect(trend[3]).toBe(12); // three days ago (no movement dated "two days ago")
    expect(trend[2]).toBe(7); // four days ago (undoing the +5 dated "three days ago")
    expect(trend[1]).toBe(7);
    expect(trend[0]).toBe(7);
  });

  it("never reports a level below zero even if the walk-back would go negative", () => {
    const movements = [{ type: "out" as const, quantity: 1000, date: daysAgo(2) }];
    const trend = buildStockTrend(5, movements);
    expect(trend.every((v) => v >= 0)).toBe(true);
  });
});

describe("sparkPoints", () => {
  it("emits one x,y pair per level spanning x=0..100", () => {
    const pairs = sparkPoints([0, 5, 10]).split(" ");
    expect(pairs).toHaveLength(3);
    expect(pairs[0].startsWith("0,")).toBe(true);
    expect(pairs[2].startsWith("100,")).toBe(true);
  });

  it("does not divide by zero (and so never emits NaN) when every level is 0", () => {
    expect(sparkPoints([0, 0, 0])).not.toMatch(/NaN/);
  });
});
