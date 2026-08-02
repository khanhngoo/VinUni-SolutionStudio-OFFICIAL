import { cn } from "@/lib/cn";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-line rounded-card",
        className,
      )}
    >
      {children}
    </div>
  );
}
