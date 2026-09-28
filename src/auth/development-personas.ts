export const developmentPersonas = ["STUDENT", "FACULTY", "PARTNER", "CAID_ADMIN", "ELAB_ADMIN"] as const;
export type DevelopmentPersona = (typeof developmentPersonas)[number];

// Browser choices are keys. Only the server resolves them to organizations.
export const developmentPartnerOrganizations = [
  { key: "BENCANG", name: "Bến Cảng Logistics" },
  { key: "VHF", name: "Vietnam Health Foundation" },
  { key: "HERITAGE", name: "National Heritage Archive" },
] as const;
