export const developmentIdentityKeys = [
  "BAO_STUDENT_DEMO",
  "BENCANG_CONTACT_DEMO",
  "CAID_ADMIN_DEMO",
  "ELAB_ADMIN_DEMO",
  "FACULTY_PHAM_DEMO",
  "HOANG_STUDENT_DEMO",
  "JORDAN_STUDENT_DEMO",
  "PRIYA_STUDENT_DEMO",
] as const;

export type DevelopmentIdentityKey = (typeof developmentIdentityKeys)[number];

interface DevelopmentIdentity {
  email: string;
  name: string;
}

const developmentIdentities: Record<DevelopmentIdentityKey, DevelopmentIdentity> = {
  BAO_STUDENT_DEMO: { email: "student.bao-tran.demo@example.test", name: "Bao Tran" },
  BENCANG_CONTACT_DEMO: { email: "contact.bencang.demo@example.test", name: "Bến Cảng Contact" },
  CAID_ADMIN_DEMO: { email: "caid.admin.dev@example.test", name: "CAID Administrator" },
  ELAB_ADMIN_DEMO: { email: "elab.admin.dev@example.test", name: "E-Lab Administrator" },
  FACULTY_PHAM_DEMO: { email: "faculty.minh-pham.demo@example.test", name: "Minh Pham" },
  HOANG_STUDENT_DEMO: { email: "student.hoang-tran.demo@example.test", name: "Hoang Tran" },
  JORDAN_STUDENT_DEMO: { email: "student.jordan-lee.demo@example.test", name: "Jordan Lee" },
  PRIYA_STUDENT_DEMO: { email: "student.priya-raman.demo@example.test", name: "Priya Raman" },
};

export function isDevelopmentAuthenticationEnabled(nodeEnvironment = process.env.NODE_ENV) {
  return nodeEnvironment !== "production";
}

export function getDevelopmentIdentity(key: unknown): DevelopmentIdentity | null {
  if (typeof key !== "string" || !Object.hasOwn(developmentIdentities, key)) return null;
  return developmentIdentities[key as DevelopmentIdentityKey];
}
