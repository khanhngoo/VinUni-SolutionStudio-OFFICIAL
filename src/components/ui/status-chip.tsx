import { Chip } from "@/components/ui/chip";
import { statusTone, type StatusKind, type StatusTone } from "@/lib/status-tone";

/** A status rendered with the platform's shared colour language. */
export function StatusChip({
  kind,
  status,
  tone,
  className,
}: {
  kind?: StatusKind;
  status?: string | null;
  /** A pre-resolved tone, for derived states (for example "closed"). */
  tone?: StatusTone;
  className?: string;
}) {
  const resolved = tone ?? statusTone(kind ?? "challenge", status);
  return (
    <Chip variant={resolved.variant} className={className}>
      {resolved.label}
    </Chip>
  );
}
