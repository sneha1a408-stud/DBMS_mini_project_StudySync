'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CourseItem {
  course_id: string;
  course_name: string;
  department: string;
  semester: string;
  description: string | null;
  coordinator: { name: string; email: string };
  _count: { enrollments: number; study_groups: number };
}

export default function CoordinatorCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New course form
  const [courseName, setCourseName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState('Fall 2026');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        setCourses(await res.json());
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_name: courseName,
          department,
          semester,
          description: description || undefined,
        }),
      });

      if (res.ok) {
        setMessage({ text: `Course "${courseName}" added to curriculum successfully!`, type: 'success' });
        setShowModal(false);
        setCourseName('');
        setDescription('');
        await loadCourses();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to create course', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error creating course', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Curriculum & Course Management</h1>
          <p>Define subjects, monitor cohort enrolments, and link peer matching tracks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Add New Course
        </button>
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

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Add New Curriculum Course</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Course Title
                </label>
                <input
                  type="text"
                  className="input"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Database Management Systems"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Semester
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Course Syllabus & Objectives
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key topics, exam guidelines, or project prerequisites..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Course...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courses List */}
      {courses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📚</div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>No Courses Assigned Yet</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 1.25rem' }}>
            You have not been assigned any courses yet. Click below to add your first curriculum subject.
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            + Add New Course
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {courses.map((c) => (
            <div key={c.course_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span className="badge badge-primary">{c.department}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.semester}</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>{c.course_name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {c.description || 'No description added.'}
                </p>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <div>👥 <strong>{c._count?.enrollments ?? 0}</strong> Students Enrolled</div>
                  <div>💬 <strong>{c._count?.study_groups ?? 0}</strong> Active Groups</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <Link
                  href={`/coordinator/students?course=${c.course_name}`}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  View Students
                </Link>
                <Link
                  href={`/coordinator/groups?courseId=${c.course_id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  View Groups
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
