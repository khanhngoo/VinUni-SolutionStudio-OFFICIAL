"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { INPUT_CLASS } from "@/components/challenge/skill-picker";

import { reissueSupervisionRequestAction } from "./actions";

export function SupervisionReissue({
  applicationPublicId,
  facultyOptions,
}: {
  applicationPublicId: string;
  facultyOptions: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [facultyId, setFacultyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const message = await reissueSupervisionRequestAction(
      applicationPublicId,
      facultyId
    );
    setPending(false);
    if (message) {
      setError(message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-line-2 pt-4">
      <label className="block text-meta font-semibold text-ink-2" htmlFor="faculty-reissue">
        Nominate another supervisor
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <select
          id="faculty-reissue"
          required
          value={facultyId}
          onChange={(event) => setFacultyId(event.target.value)}
          className={`${INPUT_CLASS} min-w-[280px] flex-1`}
        >
          <option value="">Select a faculty member…</option>
          {facultyOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !facultyId}
          className="h-10 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send new request"}
        </button>
      </div>
      {error ? <p role="alert" className="text-meta text-warn mt-2">{error}</p> : null}
      {saved ? (
        <p className="text-meta text-ok mt-2">
          New request saved with a fresh five-working-day deadline.
        </p>
      ) : null}
    </form>
  );
}
