import type { WineType } from "@/lib/database.types";

export const RACK_COUNT = 15;
export const SLOTS_PER_RACK = 9;

export const WINE_TYPE_LABEL: Record<WineType, string> = {
  rot: "Rotwein",
  weiss: "Weißwein",
  rose: "Rosé",
  sekt: "Sekt",
};

export interface WineItem {
  id: string;
  name: string;
  wineType: WineType | null;
  currentStock: number;
  unit: string;
}

export interface SlotData {
  id: string;
  rackNumber: number;
  slotNumber: number;
  flipped: boolean;
  item: WineItem | null;
}

export interface CabinetData {
  id: string;
  name: string;
  temperatureC: number | null;
  slots: SlotData[];
}

export function rackSlots(cabinet: CabinetData, rackNumber: number): SlotData[] {
  return cabinet.slots
    .filter((s) => s.rackNumber === rackNumber)
    .sort((a, b) => a.slotNumber - b.slotNumber);
}

export function rackSummary(slots: SlotData[]): string {
  const filled = slots.filter((s) => s.item);
  if (filled.length === 0) return "Leer";
  const names = new Set(filled.map((s) => s.item!.name));
  return names.size === 1 ? filled[0].item!.name : `${names.size} Sorten`;
}
