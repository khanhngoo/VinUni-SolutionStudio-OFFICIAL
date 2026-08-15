import Link from "next/link";
import { NavLinks } from "@/components/layout/nav-links";
import { currentStudent, initials } from "@/lib/data/student";

/** The VinUniversity chevron mark: navy left half, red right half. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden className={className}>
      <path d="M1 1h7.2L12 15.5 15.8 1H23L12 21.5Z" fill="var(--color-brand)" />
      <path d="M15.8 1H23L12 21.5l3.2-6.2Z" fill="var(--color-red)" />
    </svg>
  );
}

export function NavBar() {
  // "Your work" used to resolve straight to the single engagement PRD D8
  // allows. The fixture already carries eleven applications at once, and a
  // student needs to see the ones still in selection too, so the link now
  // points at the hub and is always present.
  return (
    <header className="h-[60px] shrink-0 bg-card border-b border-line">
      <div className="h-full px-7 flex items-center justify-between gap-6">
        <Link
          href="/challenges"
          className="flex items-center gap-2.5 font-bold text-[14px] tracking-[0.01em] uppercase text-brand hover:text-brand"
        >
          <BrandMark className="w-6 h-[22px]" />
          Solutions Studio
        </Link>

        <nav className="flex items-center gap-5 sm:gap-[22px]">
          <NavLinks />
          <span
            className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-[10px] font-semibold"
            title={currentStudent.name}
          >
            {initials(currentStudent.name)}
          </span>
        </nav>
      </div>
    </header>
  );
}
