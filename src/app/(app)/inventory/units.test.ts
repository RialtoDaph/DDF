import { describe, it, expect } from "vitest";
import { isMeasurementUnit, requiresUnitVolume } from "./units";

describe("isMeasurementUnit", () => {
  it("recognizes plain measurement units case- and whitespace-insensitively", () => {
    expect(isMeasurementUnit("ml")).toBe(true);
    expect(isMeasurementUnit("KG")).toBe(true);
    expect(isMeasurementUnit(" l ")).toBe(true);
  });

  it("rejects purchasing-count units", () => {
    expect(isMeasurementUnit("Flasche")).toBe(false);
    expect(isMeasurementUnit("Kiste")).toBe(false);
    expect(isMeasurementUnit("Stk.")).toBe(false);
  });
});

describe("requiresUnitVolume", () => {
  it("requires it only for Flasche", () => {
    expect(requiresUnitVolume("Flasche")).toBe(true);
    expect(requiresUnitVolume("flasche")).toBe(true);
    expect(requiresUnitVolume(" Flasche ")).toBe(true);
  });

  it("does not require it for other non-measurement units", () => {
    expect(requiresUnitVolume("Kiste")).toBe(false);
    expect(requiresUnitVolume("Stk.")).toBe(false);
    expect(requiresUnitVolume("kg")).toBe(false);
  });
});
