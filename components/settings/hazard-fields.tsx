import type { HazardProfile } from "@/lib/types";

const SCENES: { value: string; label: string }[] = [
  { value: "generic", label: "Generic (no photo illustration)" },
  { value: "panel", label: "Electrical panel" },
  { value: "cord", label: "Cord / cable" },
  { value: "vest", label: "Worker / PPE" },
  { value: "egress", label: "Egress path" },
  { value: "ladder", label: "Ladder" },
  { value: "lift", label: "Lift / equipment" },
];

const RISKS = ["low", "medium", "high", "critical"];

export function HazardFields({
  categories,
  defaults,
}: {
  categories: string[];
  defaults?: HazardProfile & { label?: string };
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">Checklist item</label>
          <input
            name="label"
            defaultValue={defaults?.label}
            required
            placeholder="e.g. Fire extinguishers accessible"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">Hazard title (AI finding)</label>
          <input
            name="title"
            defaultValue={defaults?.title}
            required
            placeholder="e.g. Obstructed fire extinguisher"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">Category</label>
          <select
            name="category"
            defaultValue={defaults?.category ?? categories[0]}
            className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">Risk if failed</label>
          <select
            name="risk"
            defaultValue={defaults?.risk ?? "medium"}
            className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm capitalize"
          >
            {RISKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">Evidence photo</label>
          <select
            name="scene"
            defaultValue={defaults?.scene ?? "generic"}
            className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm"
          >
            {SCENES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-foreground/60">Regulatory reference</label>
        <input
          name="regulatoryReference"
          defaultValue={defaults?.regulatoryReference}
          placeholder="e.g. OSHA 1926.150(a)(5)"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-foreground/60">AI explanation</label>
        <textarea
          name="narrative"
          defaultValue={defaults?.narrative}
          rows={2}
          placeholder="What the AI should say it saw when this item fails, e.g. &quot;Extinguisher station partially blocked by staged material.&quot;"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-foreground/60">Suggested corrective action</label>
        <input
          name="remedy"
          defaultValue={defaults?.remedy}
          placeholder="e.g. Relocate obstructing material and verify extinguisher charge"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>
    </div>
  );
}
