import { peers } from "@/lib/data/peers";
import { currentStudent } from "@/lib/data/student";
import { courses } from "@/lib/data/transcript";
import type { DirectoryStudent, PinnedCourse } from "@/lib/types";

/**
 * The student directory as a partner sees it.
 *
 * Three roles, three slices of the same person:
 *
 *   Peer      roles + availability          — enough to decide about teaming up
 *   Partner   + skills, band, pinned work   — enough to judge fit for a brief
 *   Student   + GPA, transcript, courses    — their own record, nobody else's
 *
 * The partner slice is built here rather than by widening `Peer`, so the
 * boundary is one file rather than a rule people have to remember. GPA and the
 * transcript never appear: a partner sees the courses a student *chose* to
 * showcase, and nothing else from the academic record.
 */

/** Provider-visible additions, keyed by the peer id they extend. */
interface DirectoryExtras {
  about: string | null;
  skills: string[];
  assessmentBand: DirectoryStudent["assessmentBand"];
  pinnedCourses: PinnedCourse[];
}

const extras: Record<string, DirectoryExtras> = {
  "stu-priya-raman": {
    about:
      "Backend engineer who likes the plumbing nobody volunteers for — schemas, ingestion, making a pipeline survive bad input.",
    skills: ["Python", "SQL", "dbt", "Airflow", "PostgreSQL"],
    assessmentBand: "Strong",
    pinnedCourses: [
      { code: "CS3110", title: "Database Systems", grade: "A" },
      { code: "CS3410", title: "Distributed Systems", grade: "A−" },
    ],
  },
  "stu-minh-anh": {
    about:
      "Business analytics student focused on turning operational data into decisions people actually act on.",
    skills: ["SQL", "Tableau", "Excel modelling", "Data analysis"],
    assessmentBand: "Proficient",
    pinnedCourses: [{ code: "BA2200", title: "Business Analytics", grade: "A" }],
  },
  "stu-thao-ha": {
    about:
      "Economics student with a research bent — most of my work has been demand modelling and policy evaluation.",
    skills: ["Stata", "Econometrics", "Survey design", "R"],
    assessmentBand: "Proficient",
    pinnedCourses: [
      { code: "EC3120", title: "Applied Econometrics", grade: "A−" },
    ],
  },
  "stu-duc-khanh": {
    about:
      "Final-year data science student. Currently at capacity on two live challenges.",
    skills: ["Python", "PyTorch", "Data analysis", "Geospatial"],
    assessmentBand: "Strong",
    pinnedCourses: [
      { code: "DS4010", title: "Machine Learning at Scale", grade: "A" },
    ],
  },
  "stu-linh-pham": {
    about:
      "Designer who codes enough to ship. Interested in how operational tools are used under time pressure.",
    skills: ["Figma", "React", "Design systems", "User research"],
    assessmentBand: null,
    pinnedCourses: [
      { code: "DS2150", title: "Interaction Design", grade: "A" },
      { code: "CS2400", title: "Web Development", grade: "B+" },
    ],
  },
  "stu-hoang-tran": {
    about:
      "Mechanical engineering student who ends up coordinating most teams I join. Comfortable with logistics and process work.",
    skills: ["CAD", "Process design", "Project coordination", "Excel modelling"],
    assessmentBand: "Proficient",
    pinnedCourses: [
      { code: "ME3300", title: "Operations & Manufacturing", grade: "A−" },
    ],
  },
};

/**
 * Students who exist only in the directory. The peer list is scoped to people
 * Jordan could plausibly invite; a partner browsing the whole cohort sees more
 * of it, and the recommender needs enough bodies to fill a ten-card deck.
 */
const directoryOnly: DirectoryStudent[] = [
  {
    id: "stu-sara-idris",
    name: "Sara Idris",
    major: "Supply Chain Management",
    year: 4,
    college: "CBM",
    about:
      "Supply chain student who has spent two summers inside a distribution centre. I like problems where the data and the warehouse floor disagree.",
    skills: ["SQL", "Python", "Inventory modelling", "Data analysis", "Power BI"],
    roles: ["Analysis", "Domain expert"],
    hoursAvailable: 12,
    weeklyAvailability: ["free", "free", "busy", "free", "partly", "free", "busy"],
    assessmentBand: "Strong",
    pinnedCourses: [
      { code: "SC4100", title: "Supply Chain Analytics", grade: "A" },
      { code: "SC3200", title: "Logistics & Distribution", grade: "A" },
    ],
    liveChallenges: 0,
  },
  {
    id: "stu-bao-tran",
    name: "Bao Tran",
    major: "Computer Science",
    year: 3,
    college: "CECS",
    about:
      "Interested in optimisation and routing. Wrote a vehicle-routing solver for a class project and never quite stopped working on it.",
    skills: ["Python", "OR-Tools", "Optimisation", "C++", "Data analysis"],
    roles: ["Data & ML", "Backend"],
    hoursAvailable: 10,
    weeklyAvailability: ["partly", "free", "free", "busy", "free", "free", "partly"],
    assessmentBand: "Proficient",
    pinnedCourses: [
      { code: "CS3600", title: "Operations Research", grade: "A" },
      { code: "CS2100", title: "Data Structures & Algorithms", grade: "A−" },
    ],
    liveChallenges: 1,
  },
  {
    id: "stu-mai-anh-ngo",
    name: "Mai Anh Ngo",
    major: "Data Science",
    year: 2,
    college: "CECS",
    about:
      "Second-year, still building breadth. Strongest with pandas and cleaning data other people gave up on.",
    skills: ["Python", "pandas", "SQL", "Visualisation"],
    roles: ["Data & ML", "Analysis"],
    hoursAvailable: 16,
    weeklyAvailability: ["free", "free", "free", "partly", "free", "free", "free"],
    assessmentBand: "Developing",
    pinnedCourses: [{ code: "DS2000", title: "Foundations of Data Science", grade: "A−" }],
    liveChallenges: 0,
  },
  {
    id: "stu-kien-pham",
    name: "Kien Pham",
    major: "Information Systems",
    year: 3,
    college: "CBM",
    about:
      "Information systems student who works at the seam between the business team and the database.",
    skills: ["SQL", "Power BI", "Process mapping", "Data analysis"],
    roles: ["Analysis", "Coordination"],
    hoursAvailable: 8,
    weeklyAvailability: ["busy", "free", "partly", "free", "free", "busy", "busy"],
    assessmentBand: "Proficient",
    pinnedCourses: [{ code: "IS3300", title: "Data Warehousing", grade: "B+" }],
    liveChallenges: 0,
  },
  {
    id: "stu-an-nguyen",
    name: "An Nguyen",
    major: "Statistics",
    year: 4,
    college: "CAS",
    about:
      "Statistics student focused on survival analysis and churn — the maths of people leaving.",
    skills: ["R", "Python", "Survival analysis", "Statistics", "SQL"],
    roles: ["Data & ML", "Research"],
    hoursAvailable: 9,
    weeklyAvailability: ["free", "partly", "free", "free", "busy", "partly", "busy"],
    assessmentBand: "Strong",
    pinnedCourses: [
      { code: "ST4200", title: "Survival & Event History Analysis", grade: "A" },
      { code: "ST3100", title: "Statistical Modelling", grade: "A" },
    ],
    liveChallenges: 0,
  },
];

/** Jordan's own directory entry, derived so the pins stay in one place. */
function currentStudentEntry(): DirectoryStudent {
  return {
    id: currentStudent.id,
    name: currentStudent.name,
    major: currentStudent.major,
    year: currentStudent.year,
    college: currentStudent.college,
    about: currentStudent.about,
    skills: currentStudent.skills,
    roles: currentStudent.usualRoles,
    hoursAvailable: currentStudent.hoursAvailable,
    weeklyAvailability: currentStudent.weeklyAvailability,
    assessmentBand: "Strong",
    pinnedCourses: pinnedCoursesFor(currentStudent.pinnedCourseIds),
    liveChallenges: 1,
  };
}

/** Resolves `Student.pinnedCourseIds` against the transcript. */
export function pinnedCoursesFor(courseIds: string[]): PinnedCourse[] {
  return courseIds
    .map((id) => courses.find((c) => c.id === id))
    .filter((c) => c !== undefined)
    .map((c) => ({
      code: c.code,
      title: c.title,
      // A pinned course always has a grade — an ungraded one has nothing to show.
      grade: c.grade ?? "—",
    }));
}

export const directoryStudents: DirectoryStudent[] = [
  currentStudentEntry(),
  ...peers.map((peer) => {
    const extra = extras[peer.id];
    if (!extra) throw new Error(`No directory extras for peer: ${peer.id}`);
    return {
      id: peer.id,
      name: peer.name,
      major: peer.major,
      year: peer.year,
      college: peer.college,
      about: extra.about,
      skills: extra.skills,
      roles: peer.roles,
      hoursAvailable: peer.hoursAvailable,
      weeklyAvailability: peer.weeklyAvailability,
      assessmentBand: extra.assessmentBand,
      pinnedCourses: extra.pinnedCourses,
      liveChallenges: peer.liveChallenges,
    };
  }),
  ...directoryOnly,
];

export function getDirectoryStudentById(
  id: string,
): DirectoryStudent | undefined {
  return directoryStudents.find((s) => s.id === id);
}
