import { describe, it, expect } from "vitest";
import { periodStartFor, periodLabel, isChecklistType } from "./lib";

describe("periodStartFor", () => {
  it("opening always uses the calendar day in Europe/Berlin, regardless of hour", () => {
    const now = new Date("2026-08-19T12:00:00Z"); // 14:00 CEST
    expect(periodStartFor("opening", now)).toBe("2026-08-19");
  });

  it("closing before the cutover hour belongs to the previous night", () => {
    const now = new Date("2026-08-19T00:00:00Z"); // 02:00 CEST — well past midnight
    expect(periodStartFor("closing", now)).toBe("2026-08-18");
  });

  it("closing at/after the cutover hour belongs to the current day", () => {
    const now = new Date("2026-08-19T06:00:00Z"); // 08:00 CEST
    expect(periodStartFor("closing", now)).toBe("2026-08-19");
  });

  it("weekly resolves to the Monday of that week", () => {
    const wednesday = new Date("2026-08-19T12:00:00Z"); // Wednesday
    expect(periodStartFor("weekly", wednesday)).toBe("2026-08-17");
  });

  it("monthly resolves to the 1st of the month", () => {
    const now = new Date("2026-08-19T12:00:00Z");
    expect(periodStartFor("monthly", now)).toBe("2026-08-01");
  });
});

describe("periodLabel", () => {
  it("formats opening/closing as a plain German date", () => {
    expect(periodLabel("opening", "2026-08-19")).toBe("19.08.2026");
  });

  it("formats weekly as a Monday–Sunday range", () => {
    expect(periodLabel("weekly", "2026-08-17")).toBe("Woche 17.08.–23.08.");
  });

  it("formats monthly as the German month name and year", () => {
    expect(periodLabel("monthly", "2026-08-01")).toBe("August 2026");
  });
});

describe("isChecklistType", () => {
  it("accepts the four known types", () => {
    for (const t of ["opening", "closing", "weekly", "monthly"]) {
      expect(isChecklistType(t)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isChecklistType("submission")).toBe(false);
    expect(isChecklistType("")).toBe(false);
  });
});
