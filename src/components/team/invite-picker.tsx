"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/data/student";
import type { Peer } from "@/lib/data/peers";
import { TEAM_ROLES, type TeamRole } from "@/lib/types";

interface InvitePickerProps {
  peers: Peer[];
  /** Already on the team — can't be invited twice. */
  takenIds: string[];
  /** False once the roster is at the challenge's maximum. */
  canInvite: boolean;
  /** Ids invited so far. Owned by the caller so the roster above can react. */
  invited: string[];
  onInvite: (peerId: string) => void;
  onRemove: (peerId: string) => void;
}

/**
 * Finding a teammate. Sorted and filtered on the two things that decide an
 * invite — free hours and the roles someone plays — rather than on academic
 * record, which is not a teammate's business.
 *
 * Controlled: the invited list belongs to whoever renders this, so the roster
 * and the fit arithmetic above it update as invitations go out. Still
 * session-only, like every other form in the prototype — nothing is sent.
 */
export function InvitePicker({
  peers,
  takenIds,
  canInvite,
  invited,
  onInvite,
  onRemove,
}: InvitePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<TeamRole | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return peers
      .filter((peer) => !takenIds.includes(peer.id))
      .filter((peer) => (role ? peer.roles.includes(role) : true))
      .filter((peer) =>
        needle === ""
          ? true
          : `${peer.name} ${peer.major} ${peer.roles.join(" ")}`
              .toLowerCase()
              .includes(needle),
      )
      .sort((a, b) => b.hoursAvailable - a.hoursAvailable);
  }, [peers, takenIds, query, role]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canInvite}
        className={cn(
          "w-full h-11 rounded-card border border-dashed font-semibold",
          canInvite
            ? "border-line text-ink-3 hover:border-brand hover:text-brand"
            : "border-line text-ink-3 opacity-50 cursor-not-allowed",
        )}
      >
        {canInvite ? "+ Invite a teammate" : "Team is full"}
      </button>
    );
  }

  return (
    <div className="bg-card border border-line rounded-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-ink">Invite a teammate</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-ink-3 hover:text-ink"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, major or role…"
        className="w-full h-9 mt-3 px-3 rounded-card border border-line bg-card text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />

      <div className="flex flex-wrap gap-1.5 mt-3">
        {TEAM_ROLES.map((r) => (
          <button key={r} type="button" onClick={() => setRole(role === r ? null : r)}>
            <Chip variant={role === r ? "solid" : "outline-dashed"}>{r}</Chip>
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2 mt-4">
        {results.map((peer) => {
          const unavailable = peer.hoursAvailable === 0 || peer.liveChallenges >= 2;
          const sent = invited.includes(peer.id);

          return (
            <li
              key={peer.id}
              className={cn(
                "border border-line rounded-card px-4 py-3",
                unavailable && "opacity-55",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-brand-soft text-brand grid place-items-center text-[11px] font-semibold shrink-0">
                  {initials(peer.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{peer.name}</p>
                  <p className="text-meta text-ink-3 mt-0.5">
                    {peer.major} · Year {peer.year} · {peer.college}
                  </p>
                </div>

                {unavailable ? (
                  <Chip variant="outline-dashed">Unavailable</Chip>
                ) : sent ? (
                  <button
                    type="button"
                    onClick={() => onRemove(peer.id)}
                    className="h-8 px-3 rounded-card border border-line text-ink-2 font-medium text-[11px] hover:border-warn hover:text-warn"
                  >
                    Withdraw invite
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onInvite(peer.id)}
                    disabled={!canInvite}
                    className="h-8 px-3 rounded-card bg-brand text-white font-semibold text-[11px] hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Invite
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <Chip variant={peer.hoursAvailable > 0 ? "default" : "outline-dashed"}>
                  {peer.hoursAvailable} h/wk free
                </Chip>
                {peer.roles.map((r) => (
                  <Chip key={r}>{r}</Chip>
                ))}
                {peer.liveChallenges > 0 ? (
                  <Chip variant="outline-dashed">
                    {peer.liveChallenges} live challenge
                    {peer.liveChallenges === 1 ? "" : "s"}
                  </Chip>
                ) : null}
              </div>
            </li>
          );
        })}

        {results.length === 0 ? (
          <li className="text-ink-3 py-6 text-center">
            Nobody matches that. Try clearing the role filter.
          </li>
        ) : null}
      </ul>

      <p className="text-meta text-ink-3 mt-3.5">
        Invitees see the challenge, the roster and the weekly commitment before
        they answer.
      </p>
    </div>
  );
}
