"use client";

import { IconFileText } from "@/components/ui/icons";

/** Opens the browser's print dialog, where "Save as PDF" makes the report a file. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex min-h-12 items-center gap-2 rounded-xl bg-sidebar-accent px-5 text-[15px] font-bold text-white"
    >
      <IconFileText width={18} height={18} strokeWidth={2} />
      Print / Save PDF
    </button>
  );
}
