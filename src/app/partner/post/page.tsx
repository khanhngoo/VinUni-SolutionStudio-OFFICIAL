import Link from "next/link";
import { PostFlow } from "@/components/partner/post-flow";
import { sampleBrief } from "@/lib/data/brief-parse";

/**
 * Posting a challenge.
 *
 * Two ways in — drop a document and correct what was read out of it, or fill
 * the form directly — because the partners who have a written brief already
 * and the ones inventing the posting on the spot are both real, and forcing
 * either down the other's path is what makes posting tools annoying.
 */
export default function PartnerPostPage() {
  return (
    <div className="max-w-[880px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        Post a challenge
      </nav>

      <PostFlow brief={sampleBrief} />
    </div>
  );
}
