import type { Evidence, Finding } from "@/lib/types";
import { EvidenceScene } from "@/components/viz/evidence-scene";
import { IconCamera } from "@/components/ui/icons";

export function EvidenceViewer({
  finding,
  evidence,
}: {
  finding: Finding;
  evidence?: Evidence;
}) {
  const where = `${finding.location.level} · ${finding.location.zone}`;

  if (evidence?.dataUrl) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={evidence.dataUrl} alt={evidence.fileName} className="max-h-[420px] w-full object-contain" />
        <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] text-white">
          {evidence.fileName}
        </span>
        <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] text-white">
          {where}
        </span>
      </div>
    );
  }

  const scene = finding.scene ?? evidence?.scene;
  if (scene) {
    return (
      <EvidenceScene
        scene={scene}
        title={finding.title}
        confidence={finding.aiConfidence}
        risk={finding.riskLevel}
        fileName={evidence?.fileName ?? "IMG_0000.jpg"}
        capturedAt={evidence?.capturedAt ?? finding.createdAt}
        location={where}
      />
    );
  }

  return (
    <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-muted text-foreground/45">
      <IconCamera width={26} height={26} />
      <p className="text-sm">No photo attached to this inspection</p>
    </div>
  );
}
