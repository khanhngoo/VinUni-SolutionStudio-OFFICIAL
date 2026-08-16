import { eq } from "drizzle-orm";

import { skillAliases, skillCategories, skills } from "../schema";
import type { SeedContext } from "./context";

export const SKILL_CATEGORY_NAMES = [
  "Data & Analytics",
  "Machine Learning & AI",
  "Software & Systems",
  "Business & Strategy",
  "Design & Research",
  "Operations & Logistics",
  "Health & Life Sciences",
  "Sustainability & Environment",
  "Humanities & Archives",
] as const;

export type SkillCategoryName = (typeof SKILL_CATEGORY_NAMES)[number];

export interface SkillSeed {
  aliases?: string[];
  category: SkillCategoryName;
  description: string;
  name: string;
  sourceLabels: string[];
}

export function normalizeSkillLookup(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const categoryDescriptions: Record<SkillCategoryName, string> = {
  "Business & Strategy":
    "Commercial, market, financial, and strategy competencies used for Solution Studio projects.",
  "Data & Analytics":
    "Data analysis, BI, statistics, databases, and analytics engineering competencies.",
  "Design & Research":
    "User, stakeholder, survey, presentation, and design research competencies.",
  "Health & Life Sciences":
    "Clinical, life-science, laboratory, and health-research competencies.",
  "Humanities & Archives":
    "Cultural, archival, language, and metadata competencies.",
  "Machine Learning & AI":
    "Machine learning, computer vision, and AI-adjacent technical competencies.",
  "Operations & Logistics":
    "Operations research, optimization, logistics, process, and simulation competencies.",
  "Software & Systems":
    "Programming, systems, robotics, and software implementation competencies.",
  "Sustainability & Environment":
    "Environment, geospatial, remote-sensing, field, and energy competencies.",
};

export const SKILL_SEEDS: SkillSeed[] = [
  {
    name: "Airflow",
    category: "Data & Analytics",
    sourceLabels: ["Airflow"],
    description: "Workflow orchestration for data pipelines.",
  },
  {
    name: "Algorithms",
    category: "Software & Systems",
    sourceLabels: ["Algorithms"],
    description: "Algorithmic problem solving and implementation.",
  },
  {
    name: "Archival Research",
    category: "Humanities & Archives",
    sourceLabels: ["Archival research"],
    description: "Archival research methods and source interpretation.",
  },
  {
    name: "Business Modelling",
    category: "Business & Strategy",
    sourceLabels: ["Business modelling"],
    description: "Business-model and operating-model analysis.",
  },
  {
    name: "C++",
    category: "Software & Systems",
    sourceLabels: ["C++"],
    description: "C++ programming.",
  },
  {
    name: "CAD",
    category: "Software & Systems",
    sourceLabels: ["CAD"],
    description: "Computer-aided design tools and workflows.",
  },
  {
    name: "Chemistry",
    category: "Health & Life Sciences",
    sourceLabels: ["Chemistry"],
    description: "Chemistry concepts and laboratory domain knowledge.",
  },
  {
    name: "Clinical Reasoning",
    category: "Health & Life Sciences",
    sourceLabels: ["Clinical reasoning"],
    description: "Clinical reasoning and evidence appraisal.",
  },
  {
    name: "Computer Vision",
    category: "Machine Learning & AI",
    sourceLabels: ["Computer vision"],
    description: "Computer vision model development and evaluation.",
  },
  {
    name: "Data Analysis",
    category: "Data & Analytics",
    sourceLabels: ["Data analysis"],
    description: "Exploratory, descriptive, and applied data analysis.",
  },
  {
    name: "Data Engineering",
    category: "Data & Analytics",
    sourceLabels: ["Data engineering"],
    description: "Data ingestion, transformation, and pipeline engineering.",
  },
  {
    name: "Data Visualization",
    category: "Data & Analytics",
    aliases: ["Data Visualisation"],
    sourceLabels: ["Data visualisation"],
    description: "Designing visual representations of data for analysis and communication.",
  },
  {
    name: "dbt",
    category: "Data & Analytics",
    sourceLabels: ["dbt"],
    description: "Analytics engineering with dbt.",
  },
  {
    name: "Design Systems",
    category: "Design & Research",
    sourceLabels: ["Design systems"],
    description: "Reusable product interface patterns and design-system practice.",
  },
  {
    name: "Econometrics",
    category: "Data & Analytics",
    sourceLabels: ["Econometrics"],
    description: "Applied econometric modelling and analysis.",
  },
  {
    name: "Energy Systems",
    category: "Sustainability & Environment",
    sourceLabels: ["Energy systems"],
    description: "Energy systems analysis and performance assessment.",
  },
  {
    name: "Excel Modelling",
    category: "Data & Analytics",
    sourceLabels: ["Excel modelling"],
    description: "Spreadsheet-based modelling and analysis.",
  },
  {
    name: "Fieldwork",
    category: "Sustainability & Environment",
    sourceLabels: ["Fieldwork"],
    description: "Field research and field data-collection practice.",
  },
  {
    name: "Figma",
    category: "Design & Research",
    sourceLabels: ["Figma"],
    description: "Interface design and prototyping with Figma.",
  },
  {
    name: "Financial Modelling",
    category: "Business & Strategy",
    sourceLabels: ["Financial modelling"],
    description: "Financial model construction and scenario analysis.",
  },
  {
    name: "GIS",
    category: "Sustainability & Environment",
    sourceLabels: ["GIS"],
    description: "Geographic information systems tools and workflows.",
  },
  {
    name: "Geospatial",
    category: "Sustainability & Environment",
    sourceLabels: ["Geospatial"],
    description: "Geospatial analysis and interpretation as represented by current fixtures.",
  },
  {
    name: "Inventory Modelling",
    category: "Operations & Logistics",
    sourceLabels: ["Inventory modelling"],
    description: "Inventory analysis and modelling.",
  },
  {
    name: "Literature Review",
    category: "Design & Research",
    sourceLabels: ["Literature review"],
    description: "Structured literature search, synthesis, and review.",
  },
  {
    name: "Market Research",
    category: "Business & Strategy",
    sourceLabels: ["Market research"],
    description: "Market and customer research methods.",
  },
  {
    name: "Market Sizing",
    category: "Business & Strategy",
    sourceLabels: ["Market sizing"],
    description: "Market sizing and market-entry analysis.",
  },
  {
    name: "Metadata Standards",
    category: "Humanities & Archives",
    sourceLabels: ["Metadata standards"],
    description: "Metadata schema and standards design.",
  },
  {
    name: "Operations Research",
    category: "Operations & Logistics",
    sourceLabels: ["Operations research"],
    description: "Operations research modelling and decision methods.",
  },
  {
    name: "Optimization",
    category: "Operations & Logistics",
    aliases: ["Optimisation"],
    sourceLabels: ["Optimisation"],
    description: "Optimization modelling and solution methods.",
  },
  {
    name: "OR-Tools",
    category: "Operations & Logistics",
    sourceLabels: ["OR-Tools"],
    description: "Optimization modelling with Google OR-Tools.",
  },
  {
    name: "Pandas",
    category: "Data & Analytics",
    sourceLabels: ["pandas"],
    description: "Data wrangling and analysis with pandas.",
  },
  {
    name: "PostgreSQL",
    category: "Data & Analytics",
    aliases: ["Postgres"],
    sourceLabels: ["PostgreSQL"],
    description: "PostgreSQL relational database development.",
  },
  {
    name: "Power BI",
    category: "Data & Analytics",
    sourceLabels: ["Power BI"],
    description: "Business intelligence reporting with Power BI.",
  },
  {
    name: "Presentation",
    category: "Business & Strategy",
    sourceLabels: ["Presentation"],
    description: "Communicating findings through structured presentations.",
  },
  {
    name: "Process Design",
    category: "Operations & Logistics",
    sourceLabels: ["Process design"],
    description: "Operational process design and improvement.",
  },
  {
    name: "Process Mapping",
    category: "Operations & Logistics",
    sourceLabels: ["Process mapping"],
    description: "Mapping operational processes and workflows.",
  },
  {
    name: "Programme Evaluation",
    category: "Health & Life Sciences",
    sourceLabels: ["Programme evaluation"],
    description: "Evaluation of programmes, interventions, and outcomes.",
  },
  {
    name: "Project Coordination",
    category: "Operations & Logistics",
    sourceLabels: ["Project coordination"],
    description: "Project coordination and team execution support.",
  },
  {
    name: "PyTorch",
    category: "Machine Learning & AI",
    sourceLabels: ["PyTorch"],
    description: "Machine learning model development with PyTorch.",
  },
  {
    name: "Python",
    category: "Software & Systems",
    sourceLabels: ["Python"],
    description: "Python programming.",
  },
  {
    name: "R",
    category: "Data & Analytics",
    sourceLabels: ["R"],
    description: "Statistical programming with R.",
  },
  {
    name: "React",
    category: "Software & Systems",
    sourceLabels: ["React"],
    description: "Frontend interface development with React.",
  },
  {
    name: "Remote Sensing",
    category: "Sustainability & Environment",
    sourceLabels: ["Remote sensing"],
    description: "Remote sensing imagery and analysis.",
  },
  {
    name: "ROS 2",
    category: "Software & Systems",
    sourceLabels: ["ROS 2"],
    description: "Robotics software development with ROS 2.",
  },
  {
    name: "Sensor Fusion",
    category: "Machine Learning & AI",
    sourceLabels: ["Sensor fusion"],
    description: "Fusing signals from multiple sensing modalities.",
  },
  {
    name: "Sensor Integration",
    category: "Software & Systems",
    sourceLabels: ["Sensor integration"],
    description: "Integrating sensors into software or hardware systems.",
  },
  {
    name: "Signal Processing",
    category: "Machine Learning & AI",
    sourceLabels: ["Signal processing"],
    description: "Signal processing and analysis.",
  },
  {
    name: "Simulation",
    category: "Operations & Logistics",
    sourceLabels: ["Simulation"],
    description: "Process or system simulation for operational analysis.",
  },
  {
    name: "SQL",
    category: "Data & Analytics",
    sourceLabels: ["SQL"],
    description: "SQL querying and relational data manipulation.",
  },
  {
    name: "Stakeholder Interviews",
    category: "Design & Research",
    sourceLabels: ["Stakeholder interviews"],
    description: "Planning and conducting stakeholder interviews.",
  },
  {
    name: "Statistics",
    category: "Data & Analytics",
    sourceLabels: ["Statistics"],
    description: "Statistical reasoning and analysis.",
  },
  {
    name: "Stata",
    category: "Data & Analytics",
    sourceLabels: ["Stata"],
    description: "Statistical analysis with Stata.",
  },
  {
    name: "Survey Design",
    category: "Design & Research",
    sourceLabels: ["Survey design"],
    description: "Survey design and questionnaire methods.",
  },
  {
    name: "Survival Analysis",
    category: "Data & Analytics",
    sourceLabels: ["Survival analysis"],
    description: "Survival and event-history analysis.",
  },
  {
    name: "Tableau",
    category: "Data & Analytics",
    sourceLabels: ["Tableau"],
    description: "Business intelligence reporting with Tableau.",
  },
  {
    name: "User Research",
    category: "Design & Research",
    sourceLabels: ["User research"],
    description: "User research methods for product and service design.",
  },
  {
    name: "Vietnamese",
    category: "Humanities & Archives",
    sourceLabels: ["Vietnamese"],
    description: "Vietnamese language competency.",
  },
  {
    name: "Visualization",
    category: "Data & Analytics",
    aliases: ["Visualisation"],
    sourceLabels: ["Visualisation"],
    description: "General visual communication and visualization competency.",
  },
];

export const SKILL_ALIASES = SKILL_SEEDS.flatMap((skill) =>
  [...new Set(skill.aliases ?? [])].map((alias) => ({
    alias,
    skillName: skill.name,
  }))
);

const redundantAliases = SKILL_ALIASES.filter(
  (seed) => normalizeSkillLookup(seed.alias) === normalizeSkillLookup(seed.skillName)
);

if (redundantAliases.length > 0) {
  throw new Error(
    `Reference skill aliases must not duplicate canonical lookup normalization: ${redundantAliases
      .map((seed) => `${seed.alias} -> ${seed.skillName}`)
      .join(", ")}`
  );
}

export async function ensureSkillCategories(ctx: SeedContext) {
  for (const name of SKILL_CATEGORY_NAMES) {
    const existing = await ctx.tx
      .select({ id: skillCategories.id })
      .from(skillCategories)
      .where(eq(skillCategories.name, name))
      .limit(2);

    if (existing.length > 1) {
      throw new Error(
        `Refusing to seed skill category "${name}": multiple existing categories use that name.`
      );
    }

    if (existing[0]) {
      ctx.setId(`skill-category:${name}`, existing[0].id);
      continue;
    }

    const [created] = await ctx.tx
      .insert(skillCategories)
      .values({ description: categoryDescriptions[name], name })
      .returning({ id: skillCategories.id });

    ctx.setId(`skill-category:${name}`, created.id);
  }

  ctx.record("REFERENCE", "skill categories", SKILL_CATEGORY_NAMES.length);
}

export async function ensureCanonicalSkills(ctx: SeedContext) {
  for (const seed of SKILL_SEEDS) {
    const categoryId = ctx.getId(`skill-category:${seed.category}`);

    const [skill] = await ctx.tx
      .insert(skills)
      .values({
        canonicalName: seed.name,
        categoryId,
        description: seed.description,
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: skills.canonicalName,
        set: {
          categoryId,
          description: seed.description,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      })
      .returning({ id: skills.id });

    ctx.setId(`skill:${seed.name}`, skill.id);
  }

  ctx.record("REFERENCE", "canonical skills", SKILL_SEEDS.length);
}

export async function ensureSkillAliases(ctx: SeedContext) {
  for (const seed of SKILL_ALIASES) {
    const skillId = ctx.getId(`skill:${seed.skillName}`);

    await ctx.tx
      .insert(skillAliases)
      .values({
        alias: seed.alias,
        skillId,
      })
      .onConflictDoNothing({
        target: [skillAliases.skillId, skillAliases.alias],
      });
  }

  ctx.record("REFERENCE", "skill aliases", SKILL_ALIASES.length);
}
