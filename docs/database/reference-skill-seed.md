# Reference Skill Seed

Phase: 3.1 bootstrap/reference seed implementation  
Date: 2026-08-16

## Scope

This document records the exact REFERENCE skill taxonomy implemented by the Phase 3.1 seed.

Phase 3.1 seeds:

- skill categories: 9
- canonical skills: 58
- lexical aliases: 4
- skill relationships: 0
- embeddings: 0

No DEMO users, students, faculty, partner organizations, challenges, applications, assessments, offers, projects, milestones, matching outputs, or scenario records are seeded in Phase 3.1.

## Source Fixture Labels Reviewed

Skill-bearing fixture sources reviewed:

- `src/lib/data/challenges.ts`
- `src/lib/data/student.ts`
- `src/lib/data/directory.ts`
- `src/lib/data/peers.ts`
- `src/lib/data/transcript.ts`
- `src/lib/data/brief-parse.ts`

Faculty research areas in `src/lib/data/faculty.ts` were reviewed as adjacent domain labels, but they are not seeded as Phase 3.1 canonical skills unless also represented by explicit challenge/student/experience/parser skill labels.

## Taxonomy Categories

| Category | Reference meaning |
|---|---|
| Data & Analytics | Data analysis, BI, statistics, databases, and analytics engineering competencies. |
| Machine Learning & AI | Machine learning, computer vision, and AI-adjacent technical competencies. |
| Software & Systems | Programming, systems, robotics, and software implementation competencies. |
| Business & Strategy | Commercial, market, financial, and strategy competencies used for Solution Studio projects. |
| Design & Research | User, stakeholder, survey, presentation, and design research competencies. |
| Operations & Logistics | Operations research, optimization, logistics, process, and simulation competencies. |
| Health & Life Sciences | Clinical, life-science, laboratory, and health-research competencies. |
| Sustainability & Environment | Environment, geospatial, remote-sensing, field, and energy competencies. |
| Humanities & Archives | Cultural, archival, language, and metadata competencies. |

Category membership is for taxonomy/navigation only. It does not imply equivalence or matching relatedness.

## Lookup Normalization Versus Stored Aliases

Canonical lookup normalization handles trivial lookup variants before checking stored aliases:

```text
trim surrounding whitespace
+ lowercase
+ collapse repeated whitespace
```

Source fixture labels that differ only by capitalization or surrounding whitespace are normalized directly to canonical skills and are not stored as `skill_aliases` rows.

Examples:

- Source fixture label `pandas` normalizes directly to canonical skill `Pandas`.
- Source fixture label `Computer vision` normalizes directly to canonical skill `Computer Vision`.
- Source fixture label `Data analysis` normalizes directly to canonical skill `Data Analysis`.

The source fixture labels remain recorded in the canonical skill table below for traceability. Stored `skill_aliases` are reserved for genuine alternate spelling, abbreviations, or lexical synonyms for the same skill.

## Canonical Skills

| Canonical skill | Category | Source fixture labels normalized |
|---|---|---|
| Airflow | Data & Analytics | `Airflow` |
| Algorithms | Software & Systems | `Algorithms` |
| Archival Research | Humanities & Archives | `Archival research` |
| Business Modelling | Business & Strategy | `Business modelling` |
| C++ | Software & Systems | `C++` |
| CAD | Software & Systems | `CAD` |
| Chemistry | Health & Life Sciences | `Chemistry` |
| Clinical Reasoning | Health & Life Sciences | `Clinical reasoning` |
| Computer Vision | Machine Learning & AI | `Computer vision` |
| Data Analysis | Data & Analytics | `Data analysis` |
| Data Engineering | Data & Analytics | `Data engineering` |
| Data Visualization | Data & Analytics | `Data visualisation` |
| dbt | Data & Analytics | `dbt` |
| Design Systems | Design & Research | `Design systems` |
| Econometrics | Data & Analytics | `Econometrics` |
| Energy Systems | Sustainability & Environment | `Energy systems` |
| Excel Modelling | Data & Analytics | `Excel modelling` |
| Fieldwork | Sustainability & Environment | `Fieldwork` |
| Figma | Design & Research | `Figma` |
| Financial Modelling | Business & Strategy | `Financial modelling` |
| GIS | Sustainability & Environment | `GIS` |
| Geospatial | Sustainability & Environment | `Geospatial` |
| Inventory Modelling | Operations & Logistics | `Inventory modelling` |
| Literature Review | Design & Research | `Literature review` |
| Market Research | Business & Strategy | `Market research` |
| Market Sizing | Business & Strategy | `Market sizing` |
| Metadata Standards | Humanities & Archives | `Metadata standards` |
| Operations Research | Operations & Logistics | `Operations research` |
| Optimization | Operations & Logistics | `Optimisation` |
| OR-Tools | Operations & Logistics | `OR-Tools` |
| Pandas | Data & Analytics | `pandas` |
| PostgreSQL | Data & Analytics | `PostgreSQL` |
| Power BI | Data & Analytics | `Power BI` |
| Presentation | Business & Strategy | `Presentation` |
| Process Design | Operations & Logistics | `Process design` |
| Process Mapping | Operations & Logistics | `Process mapping` |
| Programme Evaluation | Health & Life Sciences | `Programme evaluation` |
| Project Coordination | Operations & Logistics | `Project coordination` |
| PyTorch | Machine Learning & AI | `PyTorch` |
| Python | Software & Systems | `Python` |
| R | Data & Analytics | `R` |
| React | Software & Systems | `React` |
| Remote Sensing | Sustainability & Environment | `Remote sensing` |
| ROS 2 | Software & Systems | `ROS 2` |
| Sensor Fusion | Machine Learning & AI | `Sensor fusion` |
| Sensor Integration | Software & Systems | `Sensor integration` |
| Signal Processing | Machine Learning & AI | `Signal processing` |
| Simulation | Operations & Logistics | `Simulation` |
| SQL | Data & Analytics | `SQL` |
| Stakeholder Interviews | Design & Research | `Stakeholder interviews` |
| Statistics | Data & Analytics | `Statistics` |
| Stata | Data & Analytics | `Stata` |
| Survey Design | Design & Research | `Survey design` |
| Survival Analysis | Data & Analytics | `Survival analysis` |
| Tableau | Data & Analytics | `Tableau` |
| User Research | Design & Research | `User research` |
| Vietnamese | Humanities & Archives | `Vietnamese` |
| Visualization | Data & Analytics | `Visualisation` |

## Seeded Lexical Aliases

Aliases are only genuine alternate spelling, abbreviation, or exact synonym variants of the same underlying competency. Case-only variants are handled by canonical lookup normalization and are not stored as aliases.

| Alias | Canonical skill |
|---|---|
| `Data Visualisation` | Data Visualization |
| `Optimisation` | Optimization |
| `Postgres` | PostgreSQL |
| `Visualisation` | Visualization |

## Intentional Non-Aliases

The following related competencies remain separate canonical skills or are deferred for explicit relationship review:

- `Pandas` is not an alias of `Python`.
- `PyTorch` is not an alias of `TensorFlow`.
- `Airflow` is not an alias of `Python`.
- `dbt` is not an alias of `SQL`.
- `PostgreSQL` is not an alias of `SQL`; only `Postgres` is an alias of `PostgreSQL`.
- `OR-Tools` is not an alias of `Optimization`.
- `Optimization` is not an alias of `Operations Research`.
- `GIS` is not an alias of `Geospatial`.
- `User Research` is not an alias of `Market Research`.
- `Visualization` is not automatically merged into `Data Visualization`.
- Case-only source fixture labels such as `pandas`, `Computer vision`, and `Market research` are not stored aliases; they are resolved by canonical lookup normalization.

These may later be connected through `skill_relationships` only after explicit human approval.

## Ambiguous Or Unseeded Labels

The following reviewed labels were not seeded as Phase 3.1 canonical skills:

- Challenge `domainTags` such as `Analytics`, `Retention`, `Operations`, `Brand`, `Market entry`, `Environment`, `Supply chain`, `Energy`, `Instrumentation`, `Digital humanities`, and `Archives` remain challenge classification/display concepts, not exact skill competencies.
- `Process analysis` appears as a parser domain tag in `brief-parse.ts`, not as an explicit skill value.
- Faculty-only `researchAreas` such as `Machine learning`, `Robotics`, `Embedded systems`, `Distributed systems`, `Data systems`, `Consumer behaviour`, `Brand strategy`, `Materials`, `Spectroscopy`, `Sustainability`, `Field methods`, `Clinical informatics`, and `Epidemiology` are deferred until faculty profile/matching seed scope is approved.
- `TensorFlow` is not present in the current inspected skill fixtures, so it is not seeded.

## Deferred Reference Layers

`skill_relationships` seeded rows: 0.

No semantic skill graph was generated. No broad relationship set was inferred from shared categories, related technologies, or fixture co-occurrence.

Embeddings created: 0.

Phase 7 may add vector columns, embedding model/version metadata, vector dimensions, and semantic fallback behavior after those decisions are reviewed.
