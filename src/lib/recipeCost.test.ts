import { describe, it, expect } from "vitest";
import { recipeLineCost, recipeDisplayUnit } from "./recipeCost";

describe("recipeLineCost", () => {
  it("returns 0 when the item is missing", () => {
    expect(recipeLineCost(5, null)).toBe(0);
  });

  it("prices a bottled ingredient per ml via unit_volume_ml", () => {
    // 700ml bottle costs 21€ -> 0.03€/ml -> 50ml costs 1.50€
    const item = { unit_volume_ml: 700, purchase_price: 21 };
    expect(recipeLineCost(50, item)).toBeCloseTo(1.5, 5);
  });

  it("prices a non-bottled ingredient directly by its own unit", () => {
    // no unit_volume_ml -> purchase_price applies per stock unit (e.g. per kg)
    const item = { unit_volume_ml: null, purchase_price: 4 };
    expect(recipeLineCost(2, item)).toBe(8);
  });

  it("treats a missing purchase_price as free rather than throwing", () => {
    expect(recipeLineCost(10, { unit_volume_ml: 700, purchase_price: null })).toBe(0);
    expect(recipeLineCost(10, { unit_volume_ml: null, purchase_price: null })).toBe(0);
  });
});

describe("recipeDisplayUnit", () => {
  it("returns an empty string when the item is missing", () => {
    expect(recipeDisplayUnit(null)).toBe("");
  });

  it("shows ml for anything with a known bottle size", () => {
    expect(recipeDisplayUnit({ unit: "Flasche", unit_volume_ml: 700 })).toBe("ml");
  });

  it("falls back to the item's own stock unit otherwise", () => {
    expect(recipeDisplayUnit({ unit: "kg", unit_volume_ml: null })).toBe("kg");
  });
});
