"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

function toCsvValue(value: unknown) {
  const str = String(value ?? "");
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function CsvExportButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  function handleClick() {
    const lines = [headers, ...rows].map((row) => row.map(toCsvValue).join(";"));
    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="ghost" onClick={handleClick} className="text-xs">
      <Download size={14} />
      CSV-Export
    </Button>
  );
}
