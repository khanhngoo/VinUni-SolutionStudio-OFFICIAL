"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import { StripedPlaceholder } from "@/components/ui/striped-placeholder";

/** What the client is allowed to know about a resource before requesting it. */
export interface SafeResource {
  name: string;
  kind: string;
  ndaTier: boolean;
  hasCredential: boolean;
}

interface ResourceListProps {
  /**
   * Credential values are deliberately NOT included here. They are stripped
   * server-side and fetched only when the student asks — otherwise the secret
   * ships in the RSC payload and "request to reveal" is theatre anyone can
   * bypass with view-source.
   */
  resources: SafeResource[];
  /** Server action returning the credential for one resource, on request. */
  revealCredential: (resourceName: string) => Promise<string | null>;
}

/**
 * Even inside the workspace, disclosure is graduated (PRD §11): NDA-tier files
 * carry a badge, and credentials stay masked behind an explicit request.
 */
export function ResourceList({
  resources,
  revealCredential,
}: ResourceListProps) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);

  async function request(name: string) {
    setPending(name);
    const value = await revealCredential(name);
    setPending(null);
    if (value !== null) {
      setRevealed((prev) => ({ ...prev, [name]: value }));
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {resources.map((resource) => {
        const isCredential = resource.hasCredential;
        const credential = revealed[resource.name];

        return (
          <div
            key={resource.name}
            className="bg-card border border-line rounded-card p-4"
          >
            <div className="flex items-start gap-3">
              <StripedPlaceholder className="w-10 h-10 rounded-card shrink-0" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{resource.name}</p>
                  {resource.ndaTier ? (
                    <Chip variant="warn">
                      <LockIcon className="w-3 h-3" />
                      NDA tier
                    </Chip>
                  ) : null}
                </div>
                <p className="text-meta text-ink-3 mt-0.5">{resource.kind}</p>

                {isCredential ? (
                  <div className="mt-2.5">
                    {credential ? (
                      <>
                        <p className="font-mono text-[11.5px] text-ink-2 bg-paper border border-line-2 rounded-card px-3 py-2 overflow-x-auto">
                          {credential}
                        </p>
                        <p className="text-meta text-ink-3 mt-1.5">
                          This access was logged against your account.
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <p className="font-mono text-[11.5px] text-ink-3 bg-paper border border-line-2 rounded-card px-3 py-2 select-none">
                          ●●●●●●●●●●●●●●●●●●
                        </p>
                        <button
                          type="button"
                          disabled={pending === resource.name}
                          onClick={() => void request(resource.name)}
                          className="h-8 px-3 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent shrink-0 disabled:opacity-60"
                        >
                          {pending === resource.name
                            ? "Requesting…"
                            : "Request access"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="h-8 px-3 mt-2.5 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Open
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
