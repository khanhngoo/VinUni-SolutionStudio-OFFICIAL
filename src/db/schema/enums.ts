import { pgEnum } from "drizzle-orm/pg-core";

export const userStatus = pgEnum("user_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const organizationType = pgEnum("organization_type", [
  "INTERNAL_UNIT",
  "EXTERNAL_PARTNER",
]);

export const organizationVerificationStatus = pgEnum(
  "organization_verification_status",
  ["PENDING", "VERIFIED", "REJECTED"]
);

export const membershipRole = pgEnum("membership_role", [
  "ADMIN",
  "PROJECT_MANAGER",
  "CONTACT_PERSON",
  "REVIEWER",
  "MEMBER",
]);

export const membershipStatus = pgEnum("membership_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const skillStatus = pgEnum("skill_status", ["ACTIVE", "INACTIVE"]);

export const normalizationStatus = pgEnum("normalization_status", [
  "PENDING",
  "NORMALIZED",
  "REJECTED",
]);

export const skillRequirementType = pgEnum("skill_requirement_type", [
  "REQUIRED",
  "PREFERRED",
  "OPTIONAL",
]);

export const skillSource = pgEnum("skill_source", [
  "SELF_DECLARED",
  "PROJECT",
  "COURSE",
  "PORTFOLIO",
  "FACULTY_VERIFIED",
  "ASSESSMENT",
  "AI_EXTRACTED",
]);

export const proficiencyLevel = pgEnum("proficiency_level", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const skillRelationshipType = pgEnum("skill_relationship_type", [
  "RELATED",
  "TRANSFERABLE",
  "PREREQUISITE",
  "ECOSYSTEM",
]);

export const challengeStatus = pgEnum("challenge_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWAITING_FACULTY",
  "FACULTY_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "PUBLISHED",
  "APPLICATIONS_OPEN",
  "MATCHING",
  "SHORTLISTING",
  "ASSESSMENT",
  "SELECTION_PENDING",
  "SELECTED",
  "ACTIVE",
  "FINAL_REVIEW",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
]);

export const challengeVisibility = pgEnum("challenge_visibility", [
  "PUBLIC_PREVIEW",
  "VINUNI_ONLY",
  "INVITE_ONLY",
  "PRIVATE",
]);

export const workMode = pgEnum("work_mode", ["ONSITE", "HYBRID", "REMOTE"]);

export const compensationType = pgEnum("compensation_type", [
  "PAID",
  "UNPAID",
  "CREDIT",
  "OTHER",
  "NOT_SPECIFIED",
]);

export const eligibilityRuleType = pgEnum("eligibility_rule_type", [
  "MIN_GPA",
  "STUDY_YEAR",
  "SCHOOL",
  "MAJOR",
  "AVAILABLE_HOURS",
  "MAX_ACTIVE_PROJECTS",
]);

export const reviewDecision = pgEnum("review_decision", [
  "APPROVED",
  "REVISION_REQUESTED",
  "REJECTED",
]);

export const facultyAssignmentStatus = pgEnum("faculty_assignment_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
]);

export const applicationStatus = pgEnum("application_status", [
  "SUBMITTED",
  "SHORTLISTED",
  "ASSESSMENT",
  "SELECTION_PENDING",
  "SELECTED",
  "REJECTED",
  "WITHDRAWN",
]);

export const applicationMemberRole = pgEnum("application_member_role", [
  "LEADER",
  "MEMBER",
]);

export const applicationMemberStatus = pgEnum("application_member_status", [
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "REMOVED",
]);

export const supervisionRequestStatus = pgEnum("supervision_request_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
]);

export const evidenceConfidence = pgEnum("evidence_confidence", [
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const skillMatchType = pgEnum("skill_match_type", [
  "EXACT",
  "RELATED",
  "TRANSFERABLE",
  "NO_MATCH",
]);

export const evidenceType = pgEnum("evidence_type", [
  "GITHUB",
  "PORTFOLIO",
  "REPORT",
  "DEMO",
  "COURSE_PROJECT",
  "CERTIFICATE",
  "FACULTY_VERIFICATION",
  "OTHER",
]);

export const verificationStatus = pgEnum("verification_status", [
  "UNVERIFIED",
  "VERIFIED",
  "REJECTED",
]);

export const assessmentQuestionType = pgEnum("assessment_question_type", [
  "MULTIPLE_CHOICE",
  "CODING",
  "PRACTICAL_TASK",
  "REASONING",
  "ADAPTIVE_FOLLOWUP",
]);

export const assessmentAiPolicy = pgEnum("assessment_ai_policy", [
  "ALLOWED",
  "ALLOWED_WITH_DISCLOSURE",
  "RESTRICTED",
]);

export const assessmentStatus = pgEnum("assessment_status", [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "ACTIVE",
  "CLOSED",
]);

export const assessmentScope = pgEnum("assessment_scope", [
  "TEAM",
  "INDIVIDUAL",
]);

export const assessmentAttemptStatus = pgEnum("assessment_attempt_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "REVIEWED",
]);

export const offerStatus = pgEnum("offer_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
]);

export const agreementType = pgEnum("agreement_type", [
  "NDA",
  "CONFIDENTIALITY",
  "DATA_ACCESS",
  "OTHER",
]);

export const projectStatus = pgEnum("project_status", [
  "ACTIVE",
  "PAUSED",
  "FINAL_REVIEW",
  "COMPLETED",
  "ARCHIVED",
]);

export const milestoneStatus = pgEnum("milestone_status", [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "REVISION_REQUESTED",
  "COMPLETED",
]);

export const milestoneReviewRole = pgEnum("milestone_review_role", [
  "FACULTY",
  "PARTNER",
  "MANAGING_ORGANIZATION",
]);

export const milestoneReviewDecision = pgEnum("milestone_review_decision", [
  "APPROVED",
  "REVISION_REQUESTED",
]);

export const deliverableType = pgEnum("deliverable_type", [
  "FILE",
  "LINK",
  "TEXT",
  "OTHER",
]);

export const feedbackType = pgEnum("feedback_type", [
  "GENERAL",
  "FACULTY_CLOSEOUT",
  "PARTNER_CLOSEOUT",
]);

export const feedbackVisibility = pgEnum("feedback_visibility", [
  "RECIPIENT",
  "PROJECT_TEAM",
  "FACULTY",
  "PARTNER",
  "MANAGING_ORGANIZATION",
  "PRIVATE_ADMIN",
]);

export const resourceSensitivity = pgEnum("resource_sensitivity", [
  "PUBLIC",
  "TEAM_ONLY",
  "CONFIDENTIAL",
  "RESTRICTED",
]);
