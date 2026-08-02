import { LockIcon } from "@/components/ui/icons";
import type { LockedBlock as LockedBlockType } from "@/lib/types";

interface LockedBlockProps {
  block: LockedBlockType;
}

/**
 * The disclosure primitive (PRD §5). Masked content is never blank space — a
 * silhouette shows there is something real behind the gate, and one line says
 * exactly what unlocks it. The silhouette is aria-hidden and unselectable so the
 * blur is not a fake lock over readable text.
 */
export function LockedBlock({ block }: LockedBlockProps) {
  const widths = ["100%", "97%", "99%", "64%", "88%"];

  return (
    <div className="relative overflow-hidden bg-card border border-line rounded-card">
      <div className="locked-blur p-4" aria-hidden="true">
        <div className="h-[15px] w-40 rounded bg-line mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: block.previewLines }).map((_, i) => (
            <div
              key={i}
              className="h-2.5 rounded bg-line-2"
              style={{ width: widths[i % widths.length] }}
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center bg-gradient-to-b from-paper/75 to-paper/95">
        <span className="w-[26px] h-[26px] rounded-card bg-line-2 border border-line grid place-items-center text-ink-2">
          <LockIcon className="w-3.5 h-3.5" />
        </span>
        <span className="font-semibold text-ink text-[12.5px]">
          {block.title}
        </span>
        <span className="text-meta text-ink-3">{block.unlockCopy}</span>
      </div>
    </div>
  );
}
