import "dotenv/config";

import { count, sql } from "drizzle-orm";

import { seedDemoApplications } from "./seed/applications";
import { seedDemoAssessments } from "./seed/assessments";
import { seedBootstrap } from "./seed/bootstrap";
import { seedDemoChallenges } from "./seed/challenges";
import { SeedContext } from "./seed/context";
import { seedDemo } from "./seed/demo";
import { seedDemoSelectionsOffersAgreements } from "./seed/offers";
import { seedDemoProjects } from "./seed/projects";
import { seedReference } from "./seed/reference";
import { formatSeedTarget, validateSeedSafety } from "./seed/safety";

type Database = typeof import("./index")["db"];
type Schema = typeof import("./schema");

async function readCounts(db: Database, schema: Schema) {
  const {
    agreements,
    applicationMembers,
    applicationProjects,
    applications,
    assessmentAttempts,
    assessmentQuestions,
    assessmentResponses,
    assessmentScores,
    assessmentSections,
    assessments,
    challengeEligibilityRules,
    challengeFacultyAssignments,
    challengeReviews,
    challenges,
    challengeSkills,
    deliverables,
    feedback,
    matchExperienceDetails,
    matchResults,
    matchSkillDetails,
    milestoneReviews,
    milestones,
    offers,
    organizationMemberships,
    organizations,
    projectMembers,
    projectResources,
    projects,
    selections,
    skillAliases,
    skillCategories,
    skillRelationships,
    skills,
    studentProfiles,
    studentSkills,
    supervisionRequests,
    users,
  } = schema;

  const [
    challengeCount,
    challengeSkillCount,
    eligibilityRuleCount,
    facultyAssignmentCount,
    challengeReviewCount,
    organizationCount,
    userCount,
    membershipCount,
    categoryCount,
    skillCount,
    aliasCount,
    relationshipCount,
    studentProfileCount,
    studentSkillCount,
    applicationCount,
    applicationMemberCount,
    applicationProjectCount,
    supervisionRequestCount,
    assessmentCount,
    assessmentSectionCount,
    assessmentQuestionCount,
    assessmentAttemptCount,
    assessmentResponseCount,
    assessmentScoreCount,
    selectionCount,
    offerCount,
    agreementCount,
    projectCount,
    projectMemberCount,
    milestoneCount,
    deliverableCount,
    milestoneReviewCount,
    projectResourceCount,
    feedbackCount,
    matchResultCount,
    matchSkillDetailCount,
    matchExperienceDetailCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(challenges),
    db.select({ count: count() }).from(challengeSkills),
    db.select({ count: count() }).from(challengeEligibilityRules),
    db.select({ count: count() }).from(challengeFacultyAssignments),
    db.select({ count: count() }).from(challengeReviews),
    db.select({ count: count() }).from(organizations),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(organizationMemberships),
    db.select({ count: count() }).from(skillCategories),
    db.select({ count: count() }).from(skills),
    db.select({ count: count() }).from(skillAliases),
    db.select({ count: count() }).from(skillRelationships),
    db.select({ count: count() }).from(studentProfiles),
    db.select({ count: count() }).from(studentSkills),
    db.select({ count: count() }).from(applications),
    db.select({ count: count() }).from(applicationMembers),
    db.select({ count: count() }).from(applicationProjects),
    db.select({ count: count() }).from(supervisionRequests),
    db.select({ count: count() }).from(assessments),
    db.select({ count: count() }).from(assessmentSections),
    db.select({ count: count() }).from(assessmentQuestions),
    db.select({ count: count() }).from(assessmentAttempts),
    db.select({ count: count() }).from(assessmentResponses),
    db.select({ count: count() }).from(assessmentScores),
    db.select({ count: count() }).from(selections),
    db.select({ count: count() }).from(offers),
    db.select({ count: count() }).from(agreements),
    db.select({ count: count() }).from(projects),
    db.select({ count: count() }).from(projectMembers),
    db.select({ count: count() }).from(milestones),
    db.select({ count: count() }).from(deliverables),
    db.select({ count: count() }).from(milestoneReviews),
    db.select({ count: count() }).from(projectResources),
    db.select({ count: count() }).from(feedback),
    db.select({ count: count() }).from(matchResults),
    db.select({ count: count() }).from(matchSkillDetails),
    db.select({ count: count() }).from(matchExperienceDetails),
  ]);

  return {
    aliases: aliasCount[0].count,
    categories: categoryCount[0].count,
    challengeEligibilityRules: eligibilityRuleCount[0].count,
    challengeFacultyAssignments: facultyAssignmentCount[0].count,
    challengeReviews: challengeReviewCount[0].count,
    challenges: challengeCount[0].count,
    challengeSkills: challengeSkillCount[0].count,
    memberships: membershipCount[0].count,
    organizations: organizationCount[0].count,
    skillRelationships: relationshipCount[0].count,
    skills: skillCount[0].count,
    studentProfiles: studentProfileCount[0].count,
    studentSkills: studentSkillCount[0].count,
    applications: applicationCount[0].count,
    applicationMembers: applicationMemberCount[0].count,
    applicationProjects: applicationProjectCount[0].count,
    supervisionRequests: supervisionRequestCount[0].count,
    assessments: assessmentCount[0].count,
    assessmentSections: assessmentSectionCount[0].count,
    assessmentQuestions: assessmentQuestionCount[0].count,
    assessmentAttempts: assessmentAttemptCount[0].count,
    assessmentResponses: assessmentResponseCount[0].count,
    assessmentScores: assessmentScoreCount[0].count,
    selections: selectionCount[0].count,
    offers: offerCount[0].count,
    agreements: agreementCount[0].count,
    projects: projectCount[0].count,
    projectMembers: projectMemberCount[0].count,
    milestones: milestoneCount[0].count,
    deliverables: deliverableCount[0].count,
    milestoneReviews: milestoneReviewCount[0].count,
    projectResources: projectResourceCount[0].count,
    feedback: feedbackCount[0].count,
    matchResults: matchResultCount[0].count,
    matchSkillDetails: matchSkillDetailCount[0].count,
    matchExperienceDetails: matchExperienceDetailCount[0].count,
    users: userCount[0].count,
  };
}

function printSummary(ctx: SeedContext) {
  const rows = ctx.summary();

  for (const section of ["BOOTSTRAP", "DEMO", "REFERENCE"] as const) {
    console.log(section);

    for (const row of rows.filter((entry) => entry.section === section)) {
      console.log(`  ${row.label}: ${row.count}`);
    }
  }
}

async function main() {
  const target = validateSeedSafety(process.env);
  const [{ db }, schema] = await Promise.all([import("./index"), import("./schema")]);

  console.log(formatSeedTarget(target));
  console.log("");

  const before = await readCounts(db, schema);

  const ctx = await db.transaction(async (tx) => {
    const seedContext = new SeedContext(tx);

    await seedBootstrap(seedContext);
    await seedReference(seedContext);
    await seedDemo(seedContext);
    await seedDemoChallenges(seedContext);
    await seedDemoApplications(seedContext);
    await seedDemoAssessments(seedContext);
    await seedDemoSelectionsOffersAgreements(seedContext);
    await seedDemoProjects(seedContext);

    return seedContext;
  });

  printSummary(ctx);

  const after = await readCounts(db, schema);

  console.log("");
  console.log("Database row counts:");
  console.log(`  organizations: ${before.organizations} -> ${after.organizations}`);
  console.log(`  users: ${before.users} -> ${after.users}`);
  console.log(`  organization memberships: ${before.memberships} -> ${after.memberships}`);
  console.log(`  challenges: ${before.challenges} -> ${after.challenges}`);
  console.log(`  challenge skills: ${before.challengeSkills} -> ${after.challengeSkills}`);
  console.log(
    `  challenge eligibility rules: ${before.challengeEligibilityRules} -> ${after.challengeEligibilityRules}`
  );
  console.log(
    `  challenge faculty assignments: ${before.challengeFacultyAssignments} -> ${after.challengeFacultyAssignments}`
  );
  console.log(
    `  challenge reviews: ${before.challengeReviews} -> ${after.challengeReviews}`
  );
  console.log(`  skill categories: ${before.categories} -> ${after.categories}`);
  console.log(`  canonical skills: ${before.skills} -> ${after.skills}`);
  console.log(`  skill aliases: ${before.aliases} -> ${after.aliases}`);
  console.log(
    `  skill relationships: ${before.skillRelationships} -> ${after.skillRelationships}`
  );
  console.log(`  student profiles: ${before.studentProfiles} -> ${after.studentProfiles}`);
  console.log(`  student skills: ${before.studentSkills} -> ${after.studentSkills}`);
  console.log(`  applications: ${before.applications} -> ${after.applications}`);
  console.log(
    `  application members: ${before.applicationMembers} -> ${after.applicationMembers}`
  );
  console.log(
    `  application projects: ${before.applicationProjects} -> ${after.applicationProjects}`
  );
  console.log(
    `  supervision requests: ${before.supervisionRequests} -> ${after.supervisionRequests}`
  );
  console.log(`  assessments: ${before.assessments} -> ${after.assessments}`);
  console.log(
    `  assessment sections: ${before.assessmentSections} -> ${after.assessmentSections}`
  );
  console.log(
    `  assessment questions: ${before.assessmentQuestions} -> ${after.assessmentQuestions}`
  );
  console.log(
    `  assessment attempts: ${before.assessmentAttempts} -> ${after.assessmentAttempts}`
  );
  console.log(
    `  assessment responses: ${before.assessmentResponses} -> ${after.assessmentResponses}`
  );
  console.log(
    `  assessment scores: ${before.assessmentScores} -> ${after.assessmentScores}`
  );
  console.log(`  selections: ${before.selections} -> ${after.selections}`);
  console.log(`  offers: ${before.offers} -> ${after.offers}`);
  console.log(`  agreements: ${before.agreements} -> ${after.agreements}`);
  console.log(`  projects: ${before.projects} -> ${after.projects}`);
  console.log(`  project members: ${before.projectMembers} -> ${after.projectMembers}`);
  console.log(`  milestones: ${before.milestones} -> ${after.milestones}`);
  console.log(`  deliverables: ${before.deliverables} -> ${after.deliverables}`);
  console.log(
    `  milestone reviews: ${before.milestoneReviews} -> ${after.milestoneReviews}`
  );
  console.log(
    `  project resources: ${before.projectResources} -> ${after.projectResources}`
  );
  console.log(`  feedback: ${before.feedback} -> ${after.feedback}`);
  console.log(`  match results: ${before.matchResults} -> ${after.matchResults}`);
  console.log(
    `  match skill details: ${before.matchSkillDetails} -> ${after.matchSkillDetails}`
  );
  console.log(
    `  match experience details: ${before.matchExperienceDetails} -> ${after.matchExperienceDetails}`
  );

  if (after.skillRelationships !== 0) {
    throw new Error(
      "Phase 3.1 does not seed skill_relationships, but existing rows are present."
    );
  }

  await db.execute(sql`select 1`);

  console.log("");
  console.log("Seed completed.");
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
