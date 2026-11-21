// ============================================================
// StudySync – Matching Algorithm
// ============================================================
// Implements the weighted compatibility formula:
//
//   Score = 0.35 × Availability + 0.30 × Skill + 0.20 × LearningStyle + 0.15 × Courses
//
// Each factor is normalized to 0–100.
// No machine learning or external APIs used.
// ============================================================

// ===== Type Definitions =====

export interface AvailabilitySlot {
  day: string;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
}

export interface CourseEnrollment {
  course_id: string;
  course_name: string;
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface StudentMatchData {
  student_id: string;
  name: string;
  email: string;
  learning_style: string | null;
  bio: string | null;
  availability: AvailabilitySlot[];
  enrollments: CourseEnrollment[];
}

export interface CompatibilityScore {
  student: StudentMatchData;
  overall: number;        // 0–100
  availability: number;   // 0–100
  skill: number;          // 0–100
  learningStyle: number;  // 0–100
  sharedCourses: number;  // 0–100
  commonCourses: CourseEnrollment[];
  commonAvailability: { day: string; overlapMinutes: number }[];
}

// ===== Weights =====
const WEIGHTS = {
  availability:  0.35,
  skill:         0.30,
  learningStyle: 0.20,
  sharedCourses: 0.15,
};

// ===== Learning Style Compatibility Matrix =====
// Values represent compatibility (0–100).
// Same style = 100, complementary styles score higher.
// Source: Based on VARK model compatibility research.
//
// Rule rationale:
//   - Visual + Reading/Writing (80): Both are static/text/diagram focused
//   - Auditory + Kinesthetic (70): Both prefer active, dynamic engagement
//   - Other cross-combinations = 50 (neutral, can still work together)
//   - Same style = 100 (maximum compatibility)
//
const LEARNING_STYLE_MATRIX: Record<string, Record<string, number>> = {
  Visual: {
    Visual:            100,
    Auditory:           60,
    'Reading/Writing':  80,
    Kinesthetic:        40,
  },
  Auditory: {
    Visual:             60,
    Auditory:          100,
    'Reading/Writing':  60,
    Kinesthetic:        70,
  },
  'Reading/Writing': {
    Visual:             80,
    Auditory:           60,
    'Reading/Writing': 100,
    Kinesthetic:        50,
  },
  Kinesthetic: {
    Visual:             40,
    Auditory:           70,
    'Reading/Writing':  50,
    Kinesthetic:       100,
  },
};

// ===== Skill Level Mapping =====
// Skill complementarity rewards students who can LEARN FROM EACH OTHER.
// Rule:
//   - Same level = 50 (can study together, but limited teaching opportunity)
//   - 1 level apart = 80 (good mentorship potential)
//   - 2 levels apart = 100 (maximum complementarity: Advanced can mentor Beginner)
//
// This follows the "Zone of Proximal Development" principle — students
// learn best from peers slightly more advanced than themselves.
//
const SKILL_LEVEL_SCORE: Record<number, number> = {
  0: 50,  // Same level
  1: 80,  // 1 level apart
  2: 100, // 2 levels apart (maximum complementarity)
};

const SKILL_NUMERIC: Record<string, number> = {
  Beginner:     1,
  Intermediate: 2,
  Advanced:     3,
};

// ===== Helper: Convert time string to minutes =====
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// ===== Factor A: Availability Overlap Score =====
//
// Algorithm:
// 1. For each day, collect all availability windows for both students.
// 2. Calculate the overlapping minutes for each pair of windows on the same day.
// 3. Sum all overlap minutes.
// 4. Normalize: (total overlap / max possible overlap) × 100
//    where max possible = minimum of total available time for either student.
// 5. This prevents penalizing students who have more availability than needed.
//
export function calculateAvailabilityScore(
  a: AvailabilitySlot[],
  b: AvailabilitySlot[]
): { score: number; commonSlots: { day: string; overlapMinutes: number }[] } {
  if (!a.length || !b.length) return { score: 0, commonSlots: [] };

  const daysWithOverlap: { day: string; overlapMinutes: number }[] = [];

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let totalOverlapMinutes = 0;
  let totalAMinutes = 0;
  let totalBMinutes = 0;

  for (const day of DAYS) {
    const slotsA = a.filter((s) => s.day === day);
    const slotsB = b.filter((s) => s.day === day);

    for (const sa of slotsA) {
      totalAMinutes += timeToMinutes(sa.end_time) - timeToMinutes(sa.start_time);
    }
    for (const sb of slotsB) {
      totalBMinutes += timeToMinutes(sb.end_time) - timeToMinutes(sb.start_time);
    }

    // Calculate overlap for this day
    let dayOverlap = 0;
    for (const sa of slotsA) {
      const startA = timeToMinutes(sa.start_time);
      const endA   = timeToMinutes(sa.end_time);

      for (const sb of slotsB) {
        const startB = timeToMinutes(sb.start_time);
        const endB   = timeToMinutes(sb.end_time);

        // Overlap = max(0, min(endA, endB) - max(startA, startB))
        const overlap = Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
        dayOverlap += overlap;
      }
    }

    if (dayOverlap > 0) {
      daysWithOverlap.push({ day, overlapMinutes: dayOverlap });
      totalOverlapMinutes += dayOverlap;
    }
  }

  // Normalize: use minimum of both students' total availability as the denominator
  // This rewards students who have matching windows relative to their schedules
  const maxPossibleOverlap = Math.min(totalAMinutes, totalBMinutes);
  const score = maxPossibleOverlap > 0
    ? Math.min(100, (totalOverlapMinutes / maxPossibleOverlap) * 100)
    : 0;

  return { score: Math.round(score), commonSlots: daysWithOverlap };
}

// ===== Factor B: Skill Complementarity Score =====
//
// Algorithm:
// 1. Find courses enrolled by BOTH students.
// 2. For each shared course, compare skill levels using the matrix.
// 3. Average the skill scores across all shared courses.
// 4. If no shared courses, return 50 (neutral — cannot assess).
//
export function calculateSkillScore(
  a: CourseEnrollment[],
  b: CourseEnrollment[]
): number {
  const sharedCourseIds = a
    .map((e) => e.course_id)
    .filter((id) => b.some((e) => e.course_id === id));

  if (!sharedCourseIds.length) return 50; // Neutral if no shared courses

  let totalScore = 0;
  for (const courseId of sharedCourseIds) {
    const skillA = a.find((e) => e.course_id === courseId)?.skill_level || 'Beginner';
    const skillB = b.find((e) => e.course_id === courseId)?.skill_level || 'Beginner';

    const numericA = SKILL_NUMERIC[skillA] ?? 1;
    const numericB = SKILL_NUMERIC[skillB] ?? 1;
    const diff = Math.abs(numericA - numericB);

    totalScore += SKILL_LEVEL_SCORE[diff] ?? 50;
  }

  return Math.round(totalScore / sharedCourseIds.length);
}

// ===== Factor C: Learning Style Score =====
//
// Algorithm:
// 1. Look up both students' learning styles in the compatibility matrix.
// 2. Return the matrix value.
// 3. If either student has no learning style, return 60 (above neutral — unknown).
//
export function calculateLearningStyleScore(
  styleA: string | null,
  styleB: string | null
): number {
  if (!styleA || !styleB) return 60; // Unknown — above neutral
  return LEARNING_STYLE_MATRIX[styleA]?.[styleB] ?? 60;
}

// ===== Factor D: Shared Course Score =====
//
// Algorithm:
// 1. Count the number of shared courses.
// 2. Normalize by: shared / max(totalA, totalB) × 100
//    Using the larger set means that students sharing fewer courses
//    get lower scores, rewarding broad overlap.
//
export function calculateCourseScore(
  a: CourseEnrollment[],
  b: CourseEnrollment[]
): { score: number; commonCourses: CourseEnrollment[] } {
  const sharedCourses = a.filter((ea) => b.some((eb) => eb.course_id === ea.course_id));
  const maxCourses = Math.max(a.length, b.length);

  const score = maxCourses > 0
    ? Math.min(100, (sharedCourses.length / maxCourses) * 100)
    : 0;

  return { score: Math.round(score), commonCourses: sharedCourses };
}

// ===== Main: Calculate Compatibility =====
export function calculateCompatibility(
  targetStudent: StudentMatchData,
  candidate: StudentMatchData
): CompatibilityScore {
  const { score: availScore, commonSlots } = calculateAvailabilityScore(
    targetStudent.availability,
    candidate.availability
  );

  const skillScore = calculateSkillScore(
    targetStudent.enrollments,
    candidate.enrollments
  );

  const lsScore = calculateLearningStyleScore(
    targetStudent.learning_style,
    candidate.learning_style
  );

  const { score: courseScore, commonCourses } = calculateCourseScore(
    targetStudent.enrollments,
    candidate.enrollments
  );

  // Weighted sum
  const overall = Math.round(
    WEIGHTS.availability  * availScore +
    WEIGHTS.skill         * skillScore +
    WEIGHTS.learningStyle * lsScore    +
    WEIGHTS.sharedCourses * courseScore
  );

  return {
    student:         candidate,
    overall:         Math.min(100, Math.max(0, overall)),
    availability:    availScore,
    skill:           skillScore,
    learningStyle:   lsScore,
    sharedCourses:   courseScore,
    commonCourses,
    commonAvailability: commonSlots,
  };
}

// ===== Rank Matches =====
export function rankMatches(
  targetStudent: StudentMatchData,
  candidates: StudentMatchData[]
): CompatibilityScore[] {
  return candidates
    .map((c) => calculateCompatibility(targetStudent, c))
    .sort((a, b) => b.overall - a.overall);
}
