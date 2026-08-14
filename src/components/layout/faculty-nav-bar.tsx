import Link from "next/link";
import { currentFacultyId, getFacultyById } from "@/lib/data/faculty";
import { initials } from "@/lib/data/student";

/** The VinUniversity chevron mark: navy left half, red right half. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden className={className}>
      <path d="M1 1h7.2L12 15.5 15.8 1H23L12 21.5Z" fill="var(--color-brand)" />
      <path d="M15.8 1H23L12 21.5l3.2-6.2Z" fill="var(--color-red)" />
    </svg>
  );
}

/**
 * The faculty portal's own header — a distinct app surface from the student
 * marketplace (different auth, different audience), so it gets its own nav
 * rather than another link bolted onto the student `NavBar`.
 */
export function FacultyNavBar() {
  const faculty = getFacultyById(currentFacultyId);

  return (
    <header className="h-[60px] shrink-0 bg-brand border-b border-brand-deep">
      <div className="h-full px-7 flex items-center justify-between gap-6">
        <Link
          href="/faculty"
          className="flex items-center gap-2.5 font-bold text-[14px] tracking-[0.01em] uppercase text-white hover:text-white"
        >
          <BrandMark className="w-6 h-[22px]" />
          Solutions Studio — Faculty
        </Link>

        <nav className="flex items-center gap-5 sm:gap-[22px]">
          <span className="hidden sm:inline-flex h-[60px] items-center border-b-2 border-red font-semibold text-white">
            Queue
          </span>
          {faculty ? (
            <span
              className="w-7 h-7 rounded-full bg-brand-deep border border-white/25 text-white grid place-items-center text-[10px] font-semibold"
              title={faculty.name}
            >
              {initials(faculty.name)}
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
