import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";

/** One thing the partner personally owes someone. */
export interface AttentionItem {
  challengeTitle: string;
  detail: string;
  /** Rendered as-is; null means there is no clock on this one. */
  due: string | null;
  href: string;
  kind: string;
  label: string;
  urgent: boolean;
}

/**
 * The partner's obligations, one row each.
 *
 * `warn` is used the same way the student pipeline uses it: the colour means
 * "you personally owe this", not "this is on fire". A deliverable sitting
 * unreviewed is the partner's debt to a student who has already done the work,
 * which is why it reads urgent before the deadline does.
 */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {items.map((item, index) => (
          <tr
            key={`${item.kind}-${item.href}-${index}`}
            className="border-b border-line-2 last:border-b-0"
          >
            <td className="py-2.5 pr-3 align-middle">
              <Link
                href={item.href}
                className="font-medium text-ink hover:text-brand"
              >
                {item.challengeTitle}
              </Link>
              <p className="text-meta text-ink-3 mt-0.5">{item.detail}</p>
            </td>

            <td className="py-2.5 pr-3 align-middle w-[152px]">
              <Chip variant="warn">{item.label}</Chip>
            </td>

            <td className="py-2.5 pr-3 align-middle w-[104px] text-right">
              <span
                className={cn(
                  "text-meta whitespace-nowrap",
                  item.urgent ? "text-warn font-medium" : "text-ink-3",
                )}
              >
                {item.due ?? "—"}
              </span>
            </td>

            <td className="py-2.5 align-middle w-[76px] text-right">
              <Link
                href={item.href}
                className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
              >
                Open →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
