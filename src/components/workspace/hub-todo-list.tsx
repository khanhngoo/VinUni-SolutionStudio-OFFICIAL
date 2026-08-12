import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { HubTodo, TodoKind } from "@/lib/workspace";

const KIND_LABELS: Record<TodoKind, string> = {
  action: "Application",
  offer: "Invitation",
  milestone: "Milestone",
  meeting: "Meeting",
};

export function HubTodoList({ todos }: { todos: HubTodo[] }) {
  if (todos.length === 0) {
    return (
      <div className="bg-card border border-line rounded-card px-5 py-6 text-center">
        <p className="font-semibold text-ink">Nothing needs you right now</p>
        <p className="text-ink-2 mt-1.5">
          Everything is either finished or sitting with someone else.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {todos.map((todo) => (
        <li
          key={todo.id}
          className="bg-card border border-line rounded-card px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip
                variant={
                  todo.urgency === "overdue" || todo.urgency === "today"
                    ? "warn"
                    : "default"
                }
              >
                {KIND_LABELS[todo.kind]}
              </Chip>
              <span
                className={cn(
                  "text-meta",
                  todo.urgency === "overdue" || todo.urgency === "today"
                    ? "text-warn font-medium"
                    : "text-ink-3",
                )}
              >
                {todo.dueLabel}
              </span>
            </div>
            <p className="font-semibold text-ink mt-2">{todo.title}</p>
            <p className="text-meta text-ink-3 mt-0.5">{todo.context}</p>
          </div>

          <Link
            href={todo.cta.href}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {todo.cta.label}
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
