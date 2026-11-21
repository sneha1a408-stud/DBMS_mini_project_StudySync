'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CourseEnrollment {
  course_id: string;
  course_name: string;
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface StudentMatchData {
  student_id: string;
  name: string;
  email: string;
  learning_style: string | null;
  bio: string | null;
  enrollments: CourseEnrollment[];
}

interface CompatibilityScore {
  student: StudentMatchData;
  overall: number;
  availability: number;
  skill: number;
  learningStyle: number;
  sharedCourses: number;
  commonCourses: CourseEnrollment[];
  commonAvailability: { day: string; overlapMinutes: number }[];
}

export default function StudentPartnersPage() {
  const [targetStudent, setTargetStudent] = useState<StudentMatchData | null>(null);
  const [matches, setMatches] = useState<CompatibilityScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState<number>(0);
  const [selectedCourse, setSelectedCourse] = useState<string>('All');

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch('/api/matching');
        if (res.ok) {
          const data = await res.json();
          setTargetStudent(data.target || null);
          setMatches(data.matches || []);
        }
      } catch (err) {
        console.error('Failed to load peer matches:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  // Get distinct course names from user's enrollments for filtering
  const userCourses = ['All', ...(targetStudent?.enrollments.map((e) => e.course_name) || [])];

  const filteredMatches = matches.filter((m) => {
    const meetsScore = m.overall >= minScore;
    const meetsCourse = selectedCourse === 'All' || m.commonCourses.some((c) => c.course_name === selectedCourse);
    return meetsScore && meetsCourse;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--primary)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--text-muted)';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Smart Study Partner Matching</h1>
        <p>Weighted peer compatibility algorithm calculated using relational schema attributes</p>
      </div>

      {/* Formula & DBMS Algorithm Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(79, 70, 229, 0.04)', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>
              🧮 Compatibility Scoring Formula
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Score = 35% Availability + 30% Skill Complementarity + 20% Learning Style + 15% Shared Courses</strong>
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              The algorithm prioritizes mutual availability hours, pairs beginner students with advanced mentors, and rewards shared course enrollments.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/student/availability" className="btn btn-secondary btn-sm">
              Update Schedule ⏰
            </Link>
            <Link href="/student/profile" className="btn btn-secondary btn-sm">
              Change Learning Style 🎓
            </Link>
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Min Score filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Min Compatibility:</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[0, 50, 70, 80].map((threshold) => (
                <button
                  key={threshold}
                  onClick={() => setMinScore(threshold)}
                  className={`btn btn-sm ${minScore === threshold ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {threshold === 0 ? 'All' : `${threshold}%+`}
                </button>
              ))}
            </div>
          </div>

          {/* Course filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter by Course:</span>
            <select
              className="input"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              {userCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredMatches.length}</strong> matching candidates
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>No Matches Found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 1.25rem' }}>
            Try lowering the minimum compatibility filter or enroll in more courses and add weekly free hours.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => setMinScore(0)} className="btn btn-secondary btn-sm">
              Reset Filters
            </button>
            <Link href="/student/courses" className="btn btn-primary btn-sm">
              Enroll in More Courses
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredMatches.map(({ student, overall, availability, skill, learningStyle, sharedCourses, commonCourses, commonAvailability }) => {
            const scoreColor = getScoreColor(overall);
            const totalOverlapHours = Math.round((commonAvailability.reduce((sum, a) => sum + a.overlapMinutes, 0) / 60) * 10) / 10;

            return (
              <div key={student.student_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Header: Name, Learning style & Overall Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{student.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {student.learning_style ? (
                          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                            🎓 {student.learning_style}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No style specified</span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.email}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '999px',
                          background: `${scoreColor}1A`,
                          color: scoreColor,
                          fontWeight: 800,
                          fontSize: '1.1rem',
                        }}
                      >
                        {overall}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Match Score
                      </div>
                    </div>
                  </div>

                  {student.bio && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
                      &ldquo;{student.bio}&rdquo;
                    </p>
                  )}

                  {/* Factor Breakdown */}
                  <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Compatibility Factor Scores:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {[
                        { label: 'Availability Overlap (35%)', val: availability, extra: `${totalOverlapHours} hrs/wk` },
                        { label: 'Skill Complementarity (30%)', val: skill },
                        { label: 'Learning Style Alignment (20%)', val: learningStyle },
                        { label: 'Shared Courses (15%)', val: sharedCourses, extra: `${commonCourses.length} shared` },
                      ].map((factor) => (
                        <div key={factor.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                            <span>{factor.label}</span>
                            <span style={{ fontWeight: 600 }}>
                              {factor.val}% {factor.extra ? `(${factor.extra})` : ''}
                            </span>
                          </div>
                          <div className="score-bar" style={{ height: 4 }}>
                            <div className="score-bar-fill" style={{ width: `${factor.val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shared Courses Badges */}
                  {commonCourses.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                        Shared Enrolled Courses:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {commonCourses.map((c) => (
                          <span
                            key={c.course_id}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              background: 'var(--bg-muted)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            📚 {c.course_name} ({c.skill_level})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overlapping Days */}
                  {commonAvailability.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                        Mutual Availability:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {commonAvailability.map((a) => (
                          <span
                            key={a.day}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--success)',
                              fontWeight: 600,
                            }}
                          >
                            📅 {a.day}: {Math.round(a.overlapMinutes / 60 * 10) / 10}h
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <Link
                    href={`/student/groups?create=true&courseId=${commonCourses[0]?.course_id || ''}`}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', textAlign: 'center' }}
                  >
                    Form Study Group Together →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
