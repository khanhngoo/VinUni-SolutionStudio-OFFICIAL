import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-[520px] mx-auto px-6 py-24 text-center">
      <h1>We couldn&apos;t find that challenge</h1>
      <p className="text-ink-2 mt-2.5">
        It may have closed, or the link may be wrong.
      </p>
      <Link
        href="/challenges"
        className="inline-flex items-center justify-center h-9 px-4 mt-6 rounded-card bg-brand text-white font-semibold hover:text-white hover:bg-brand-deep"
      >
        Back to the marketplace
      </Link>
    </div>
  );
}
