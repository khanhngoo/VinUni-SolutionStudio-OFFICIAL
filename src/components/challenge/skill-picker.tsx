"use client";

import { useEffect, useMemo, useState } from "react";

import type { CanonicalSkillOption } from "@/db/queries/skills";

export type RequirementType = "REQUIRED" | "PREFERRED";

export interface InitialSkillSelection {
  canonicalName: string;
  requirementType: RequirementType;
}

const INPUT_CLASS =
  "w-full h-10 px-3 rounded-card border border-line bg-card text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * Shared canonical-skill picker used by both `/partner/post` and the
 * partner challenge edit form. Partners may only check existing active
 * canonical skills (`canonicalSkills`, read server-side from the frozen
 * taxonomy) and mark each REQUIRED/PREFERRED — there is no free-text skill
 * input. Selection is serialized into a hidden field named `hiddenFieldName`
 * so the enclosing `<form>`'s server action receives it as plain
 * `FormData`; canonical identity/validity is re-checked server-side by
 * `createChallengeDraft`/`updateChallengeDraft`, never trusted from here.
 */
export function SkillPicker({
  canonicalSkills,
  hiddenFieldName,
  initialSelected = [],
  onSelectionCountChange,
}: {
  canonicalSkills: CanonicalSkillOption[];
  hiddenFieldName: string;
  initialSelected?: InitialSkillSelection[];
  onSelectionCountChange?: (count: number) => void;
}) {
  const [selected, setSelected] = useState<Map<string, RequirementType>>(
    () => new Map(initialSelected.map((item) => [item.canonicalName, item.requirementType]))
  );
  const [query, setQuery] = useState("");

  // Reports the selection count to the parent form (used to disable submit
  // until at least one skill is selected) from an effect rather than from
  // inside the `setSelected` updater callback — updater callbacks can run
  // during React's render phase, and calling a different component's
  // `setState` from there trips React's "Cannot update a component while
  // rendering a different component" warning.
  useEffect(() => {
    onSelectionCountChange?.(selected.size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const grouped = useMemo(() => {
    const filtered = canonicalSkills.filter((skill) =>
      skill.canonicalName.toLowerCase().includes(query.trim().toLowerCase())
    );
    const groups = new Map<string, CanonicalSkillOption[]>();
    for (const skill of filtered) {
      const key = skill.categoryName ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(skill);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [canonicalSkills, query]);

  const skillsJson = useMemo(() => {
    const list: InitialSkillSelection[] = Array.from(selected.entries()).map(
      ([canonicalName, requirementType]) => ({ canonicalName, requirementType })
    );
    return JSON.stringify(list);
  }, [selected]);

  function toggleSkill(canonicalName: string, checked: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(canonicalName, next.get(canonicalName) ?? "REQUIRED");
      } else {
        next.delete(canonicalName);
      }
      return next;
    });
  }

  function setRequirement(canonicalName: string, requirementType: RequirementType) {
    setSelected((current) => {
      if (!current.has(canonicalName)) return current;
      const next = new Map(current);
      next.set(canonicalName, requirementType);
      return next;
    });
  }

  return (
    <div>
      <input type="hidden" name={hiddenFieldName} value={skillsJson} />
      <input
        type="search"
        placeholder="Search skills…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={`${INPUT_CLASS} mt-2.5`}
      />

      <div className="mt-3 flex flex-col gap-4 max-h-[360px] overflow-y-auto border border-line rounded-card p-3.5">
        {grouped.length === 0 ? (
          <p className="text-meta text-ink-3">No skills match &quot;{query}&quot;.</p>
        ) : (
          grouped.map(([categoryName, list]) => (
            <div key={categoryName}>
              <h4 className="text-meta font-semibold text-ink-3">{categoryName}</h4>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {list.map((skill) => {
                  const requirement = selected.get(skill.canonicalName);
                  return (
                    <div key={skill.id} className="flex items-center justify-between gap-2 py-1">
                      <label className="flex items-center gap-2 text-ink-2">
                        <input
                          type="checkbox"
                          checked={requirement !== undefined}
                          onChange={(event) => toggleSkill(skill.canonicalName, event.target.checked)}
                        />
                        {skill.canonicalName}
                      </label>
                      {requirement !== undefined ? (
                        <select
                          value={requirement}
                          onChange={(event) =>
                            setRequirement(skill.canonicalName, event.target.value as RequirementType)
                          }
                          className="text-meta border border-line rounded-card px-1.5 py-0.5"
                        >
                          <option value="REQUIRED">Required</option>
                          <option value="PREFERRED">Preferred</option>
                        </select>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      {selected.size === 0 ? (
        <p className="text-meta text-red mt-1.5">Select at least one skill.</p>
      ) : null}
    </div>
  );
}

export { INPUT_CLASS };
