import { applications } from "@/lib/data/applications";
import { challenges } from "@/lib/data/challenges";
import { faculty } from "@/lib/data/faculty";
import type { Application, Challenge, Faculty, Meeting } from "@/lib/types";
import { matchesFilters, sortChallenges, type FilterState } from "@/lib/filters";

export function getChallenges(filters: FilterState): Challenge[] {
  return sortChallenges(
    challenges.filter((c) => matchesFilters(c, filters)),
    filters.sort,
  );
}

export function getChallengeById(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}

export function getAllChallengeIds(): string[] {
  return challenges.map((c) => c.id);
}

/**
 * Supervisor options for the apply modal: the challenge's suggested faculty
 * first, then everyone else, so the obvious choices sit at the top.
 */
export function getFacultyOptions(challenge: Challenge): Faculty[] {
  const suggested = challenge.suggestedFacultyIds
    .map((id) => faculty.find((f) => f.id === id))
    .filter((f): f is Faculty => f !== undefined);

  const rest = faculty.filter((f) => !challenge.suggestedFacultyIds.includes(f.id));

  return [...suggested, ...rest];
}

export function totalChallengeCount(): number {
  return challenges.length;
}

export function getFacultyById(id: string): Faculty | undefined {
  return faculty.find((f) => f.id === id);
}

export function getApplications(): Application[] {
  return applications;
}

export function getApplicationById(id: string): Application | undefined {
  return applications.find((a) => a.id === id);
}

export function getApplicationByChallengeId(
  challengeId: string,
): Application | undefined {
  return applications.find((a) => a.challengeId === challengeId);
}

export function getAllApplicationIds(): string[] {
  return applications.map((a) => a.id);
}

export interface ApplicationWithChallenge {
  application: Application;
  challenge: Challenge;
}

/**
 * Joined view — the shape the pipeline screens render. Applications whose
 * challenge no longer resolves are dropped rather than rendered as holes.
 */
export function getApplicationsWithChallenge(): ApplicationWithChallenge[] {
  return applications
    .map((application) => {
      const challenge = getChallengeById(application.challengeId);
      return challenge ? { application, challenge } : undefined;
    })
    .filter((row): row is ApplicationWithChallenge => row !== undefined);
}

export interface MeetingWithContext {
  meeting: Meeting;
  application: Application;
  challenge: Challenge;
}

/**
 * Every meeting across every project, carrying the application and challenge
 * it belongs to. Meetings live inside a project record, so the owning
 * application is the only way back to a title or a workspace link.
 */
export function getAllMeetings(): MeetingWithContext[] {
  return getApplicationsWithChallenge().flatMap(({ application, challenge }) =>
    (application.project?.meetings ?? []).map((meeting) => ({
      meeting,
      application,
      challenge,
    })),
  );
}

export function getMeetingById(
  meetingId: string,
): MeetingWithContext | undefined {
  return getAllMeetings().find((row) => row.meeting.id === meetingId);
}

export function getAllMeetingIds(): string[] {
  return getAllMeetings().map((row) => row.meeting.id);
}
