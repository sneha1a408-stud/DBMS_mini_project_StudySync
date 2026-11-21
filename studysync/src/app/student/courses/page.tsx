'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EnrolledCourse {
  course: {
    course_id: string;
    course_name: string;
    department: string;
    semester: string;
    description: string | null;
    coordinator: { name: string };
  };
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
  enrollment_date: string;
}

interface AvailableCourse {
  course_id: string;
  course_name: string;
  department: string;
  semester: string;
  description: string | null;
  coordinator: { name: string; email: string };
  _count: { enrollments: number; study_groups: number };
}

export default function StudentCoursesPage() {
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [allCourses, setAllCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      const [profileRes, coursesRes] = await Promise.all([
        fetch('/api/students/profile'),
        fetch('/api/courses'),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setEnrolled(p.enrollments || []);
      }
      if (coursesRes.ok) {
        const c = await coursesRes.json();
        setAllCourses(c || []);
      }
    } catch (err) {
      console.error('Failed to load courses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnroll = async (courseId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, skill_level: skillLevel }),
      });
      if (res.ok) {
        setMessage({ text: 'Enrolled in course successfully! Find study partners in this course.', type: 'success' });
        setEnrollingCourseId(null);
        await loadData();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to enroll', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error enrolling in course', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDrop = async (courseId: string, courseName: string) => {
    if (!confirm(`Are you sure you want to drop "${courseName}"?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/enrollments?courseId=${courseId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage({ text: `Successfully dropped ${courseName}`, type: 'success' });
        await loadData();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to drop course', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error dropping course', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const enrolledCourseIds = new Set(enrolled.map((e) => e.course.course_id));
  const departments = ['All', ...Array.from(new Set(allCourses.map((c) => c.department)))];

  const filteredAvailable = allCourses.filter((c) => {
    const matchesSearch = c.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || c.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Courses & Course Catalog</h1>
        <p>Manage your course enrollments and declare your skill level for peer matching</p>
      </div>

      {message && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderLeft: `4px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ fontWeight: 600, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {message.type === 'success' ? '✓ ' : '⚠ '}
            {message.text}
          </div>
        </div>
      )}

      {/* Section 1: Enrolled Courses */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Currently Enrolled Courses ({enrolled.length})</h2>
            <p style={{ fontSize: '0.85rem' }}>Skill levels help the algorithm pair you with complementary study partners</p>
          </div>
        </div>

        {enrolled.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📚 You haven&apos;t enrolled in any courses yet.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Browse the course catalog below to enroll and unlock peer matching.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {enrolled.map((item) => (
              <div key={item.course.course_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary">{item.course.department}</span>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background:
                          item.skill_level === 'Advanced' ? 'rgba(16, 185, 129, 0.15)' :
                          item.skill_level === 'Intermediate' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color:
                          item.skill_level === 'Advanced' ? 'var(--success)' :
                          item.skill_level === 'Intermediate' ? 'var(--primary)' : 'var(--warning)',
                      }}
                    >
                      {item.skill_level}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{item.course.course_name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Semester: {item.course.semester} • Coordinator: {item.course.coordinator?.name || 'Faculty'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <Link
                    href={`/student/partners?courseId=${item.course.course_id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    Find Partners
                  </Link>
                  <button
                    onClick={() => handleDrop(item.course.course_id, item.course.course_name)}
                    className="btn btn-sm"
                    style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                    disabled={actionLoading}
                  >
                    Drop
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Course Catalog */}
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Browse Available Courses</h2>
          <p style={{ fontSize: '0.85rem' }}>Discover and enroll in university subjects</p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="Search courses or departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`btn btn-sm ${selectedDept === dept ? 'btn-primary' : 'btn-secondary'}`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredAvailable.map((c) => {
            const isEnrolled = enrolledCourseIds.has(c.course_id);
            const isCurrentlySelecting = enrollingCourseId === c.course_id;

            return (
              <div key={c.course_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <span className="badge badge-primary">{c.department}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.semester}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{c.course_name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    {c.description || 'No description provided.'}
                  </p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    👥 {c._count?.enrollments ?? 0} students enrolled • {c._count?.study_groups ?? 0} study groups
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  {isEnrolled ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>✓ Enrolled</span>
                      <Link href={`/student/partners?courseId=${c.course_id}`} className="btn btn-secondary btn-sm">
                        Find Partners →
                      </Link>
                    </div>
                  ) : isCurrentlySelecting ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                        Your Skill Level:
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                        {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setSkillLevel(lvl)}
                            className={`btn btn-sm ${skillLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, fontSize: '0.75rem' }}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleEnroll(c.course_id)}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Enrolling...' : 'Confirm Enrollment'}
                        </button>
                        <button
                          onClick={() => setEnrollingCourseId(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEnrollingCourseId(c.course_id)}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                    >
                      Enroll in Course +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
