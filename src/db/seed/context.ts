import type { db } from "../index";

export type SeedTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type SeedSection = "BOOTSTRAP" | "REFERENCE";

export class SeedContext {
  private readonly ids = new Map<string, bigint>();
  private readonly counts = new Map<string, number>();

  constructor(readonly tx: SeedTransaction) {}

  setId(seedKey: string, id: bigint) {
    this.ids.set(seedKey, id);
  }

  getId(seedKey: string): bigint {
    const id = this.ids.get(seedKey);

    if (id === undefined) {
      throw new Error(`Missing seed id for key: ${seedKey}`);
    }

    return id;
  }

  record(section: SeedSection, label: string, count = 1) {
    const key = `${section}:${label}`;
    this.counts.set(key, (this.counts.get(key) ?? 0) + count);
  }

  summary() {
    return [...this.counts.entries()]
      .map(([key, count]) => {
        const [section, label] = key.split(":");
        return { section: section as SeedSection, label, count };
      })
      .sort((a, b) =>
        a.section === b.section
          ? a.label.localeCompare(b.label)
          : a.section.localeCompare(b.section)
      );
  }
}
