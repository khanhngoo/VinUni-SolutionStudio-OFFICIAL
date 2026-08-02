import Link from "next/link";
import { cn } from "@/lib/cn";

export type WorkspaceTab = "overview" | "milestones" | "deliverables" | "resources";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "milestones", label: "Milestones" },
  { id: "deliverables", label: "Deliverables" },
  { id: "resources", label: "Resources" },
];

interface WorkspaceTabsProps {
  applicationId: string;
  active: WorkspaceTab;
}

/** Tabs are links carrying the tab in the URL, so they survive reload. */
export function WorkspaceTabs({ applicationId, active }: WorkspaceTabsProps) {
  return (
    <nav className="flex items-end gap-1 border-b border-line overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={
              tab.id === "overview"
                ? `/workspace/${applicationId}`
                : `/workspace/${applicationId}?tab=${tab.id}`
            }
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "h-10 px-4 inline-flex items-center border-b-2 whitespace-nowrap",
              isActive
                ? "border-red font-semibold text-brand hover:text-brand"
                : "border-transparent text-ink-2 hover:text-brand",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function parseTab(value: string | string[] | undefined): WorkspaceTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return TABS.some((t) => t.id === raw) ? (raw as WorkspaceTab) : "overview";
}
