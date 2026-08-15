import type { Organization } from "@/lib/types";

/**
 * The partners that post challenges.
 *
 * Introduced with the provider portal. Before it, a poster existed only as
 * loose display fields on each Challenge, so nothing could answer "which
 * challenges are mine". These records are the owner; the display fields stay
 * on Challenge because a confidential posting deliberately shows a category
 * where the name would go.
 *
 * `bencang` deliberately owns several postings rather than one. A partner with
 * a single challenge has no portfolio to manage, and every screen in the portal
 * — the index, the pipeline board, the approvals queue — only earns its place
 * once there is more than one thing in flight.
 */
export const organizations: Organization[] = [
  {
    id: "org-bencang",
    name: "Bến Cảng Logistics",
    category: "Logistics group, Hai Phong",
    kind: "Company",
    initials: "BC",
    about:
      "Port and distribution operator running freight, warehousing and last-mile delivery across the northern corridor. Posts operations and analytics work that touches live routing and merchant data.",
    contact: {
      name: "Dung Tran",
      role: "Head of Operations Analytics",
      email: "dung.tran@bencanglogistics.vn",
    },
  },
  {
    id: "org-vinai",
    name: "VinAI Research",
    category: "Research lab, Hanoi",
    kind: "Lab",
    initials: "VA",
    about: "Applied machine learning lab working on perception and multimodal systems.",
    contact: {
      name: "Dr. Hieu Le",
      role: "Research Lead",
      email: "hieu.le@vinai.io",
    },
  },
  {
    id: "org-consumer",
    name: "Sao Mai Consumer",
    category: "Consumer brand, Ho Chi Minh City",
    kind: "Company",
    initials: "SM",
    about: "Consumer goods brand posting positioning and market research work.",
    contact: {
      name: "Quynh Pham",
      role: "Brand Strategy Manager",
      email: "quynh.pham@saomai.vn",
    },
  },
  {
    id: "org-mekong",
    name: "Mekong Ventures",
    category: "Venture firm, Singapore",
    kind: "Company",
    initials: "MV",
    about: "Early-stage venture firm posting market entry and diligence work.",
    contact: {
      name: "Alan Chua",
      role: "Principal",
      email: "alan.chua@mekongvc.sg",
    },
  },
  {
    id: "org-green",
    name: "Hanoi Green Initiative",
    category: "Non-profit, Hanoi",
    kind: "Company",
    initials: "HG",
    about: "Urban environment non-profit working on heat, air quality and green cover.",
    contact: {
      name: "Mai Vu",
      role: "Programme Director",
      email: "mai.vu@hanoigreen.org",
    },
  },
  {
    id: "org-materials",
    name: "VinUni Materials Lab",
    category: "University lab, Hanoi",
    kind: "Lab",
    initials: "ML",
    about: "Materials characterisation lab running spectroscopy and imaging pipelines.",
    contact: {
      name: "Dr. Tuan Bui",
      role: "Lab Director",
      email: "tuan.bui@vinuni.edu.vn",
    },
  },
  {
    id: "org-health",
    name: "VinUni Health Sciences",
    category: "University lab, Hanoi",
    kind: "Lab",
    initials: "HS",
    about: "Clinical research group working on protocol design and triage systems.",
    contact: {
      name: "Dr. Lan Nguyen",
      role: "Associate Dean, Research",
      email: "lan.nguyen@vinuni.edu.vn",
    },
  },
  {
    id: "org-vhf",
    name: "Vietnam Health Foundation",
    category: "Non-profit, Hanoi",
    kind: "Company",
    initials: "VH",
    about: "Public health non-profit running community outreach and screening programmes.",
    contact: {
      name: "Ngoc Bui",
      role: "Outreach Lead",
      email: "ngoc.bui@vhf.org.vn",
    },
  },
  {
    id: "org-facilities",
    name: "VinUni Facilities",
    category: "University department, Hanoi",
    kind: "Faculty",
    initials: "VF",
    about: "Campus operations, posting energy and building performance work.",
    contact: {
      name: "Hai Do",
      role: "Facilities Manager",
      email: "hai.do@vinuni.edu.vn",
    },
  },
  {
    id: "org-heritage",
    name: "National Heritage Archive",
    category: "Cultural institution, Hanoi",
    kind: "Company",
    initials: "NH",
    about: "National archive digitising and cataloguing historical collections.",
    contact: {
      name: "Thu Hoang",
      role: "Head of Digital Collections",
      email: "thu.hoang@heritage.gov.vn",
    },
  },
];

/**
 * v1 has no auth — the provider portal always renders as this partner, the
 * same way the student portal always renders as Jordan Lee.
 */
export const currentOrgId = "org-bencang";

export function getOrganizationById(id: string): Organization | undefined {
  return organizations.find((o) => o.id === id);
}

export function currentOrganization(): Organization {
  const org = getOrganizationById(currentOrgId);
  if (!org) throw new Error(`Unknown organization: ${currentOrgId}`);
  return org;
}
