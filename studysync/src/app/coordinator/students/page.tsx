'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface StudentRow {
  student_id: string;
  student_name: string;
  student_email: string;
  learning_style: string | null;
  enrolled_courses: number;
  group_count: number;
}

function CoordinatorStudentsContent() {
  const searchParams = useSearchParams();
  const initialCourse = searchParams.get('course') || '';

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStyle, setFilterStyle] = useState('All');

  // Deletion modal states
  const [studentToDelete, setStudentToDelete] = useState<StudentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch('/api/coordinator/students');
        if (res.ok) {
          setStudents(await res.json());
        }
      } catch (err) {
        console.error('Failed to load coordinator students:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, []);

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/coordinator/students?studentId=${studentToDelete.student_id}`, {
        method: 'DELETE',
      });
      
      let data: { error?: string; message?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Ignore JSON parse error if response was plain text
      }

      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete student account.');
        setIsDeleting(false);
        return;
      }

      // Remove student from UI list
      setStudents((prev) => prev.filter((s) => s.student_id !== studentToDelete.student_id));
      setSuccessMsg(`Account for "${studentToDelete.student_name}" was successfully removed. Their login access has been permanently revoked.`);
      setStudentToDelete(null);
    } catch (err) {
      console.error('Error deleting student:', err);
      setDeleteError('An unexpected network error occurred while deleting the student.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const learningStyles = ['All', 'Visual', 'Auditory', 'Read/Write', 'Kinesthetic', 'Unspecified'];

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_email.toLowerCase().includes(search.toLowerCase());

    const styleVal = s.learning_style || 'Unspecified';
    const matchesStyle = filterStyle === 'All' || styleVal === filterStyle;

    return matchesSearch && matchesStyle;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Enrolled Students Directory</h1>
        <p>Directory of enrolled students across your assigned academic cohorts</p>
      </div>

      {successMsg && (
        <div
          className="alert alert-success"
          style={{
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {initialCourse && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1.25rem', background: 'rgba(79, 70, 229, 0.05)', borderLeft: '4px solid var(--primary)' }}>
          Showing student cohort enrolled in <strong>{initialCourse}</strong>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <input
            type="text"
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="Search student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '0.25rem' }}>Learning Style:</span>
            {learningStyles.map((style) => (
              <button
                key={style}
                onClick={() => setFilterStyle(style)}
                className={`btn btn-sm ${filterStyle === style ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem' }}
              >
                {style}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total <strong>{filteredStudents.length}</strong> Students
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Student Name</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Email Address</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Learning Style</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Enrolled Courses</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Study Groups Joined</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Cohort Engagement</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No students match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const engagement = s.group_count > 0 ? 'High' : s.enrolled_courses > 0 ? 'Medium' : 'Inactive';
                  const engagementColor =
                    engagement === 'High' ? 'var(--success)' :
                    engagement === 'Medium' ? 'var(--primary)' : 'var(--text-muted)';

                  return (
                    <tr key={s.student_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>
                        {s.student_name}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {s.student_email}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {s.learning_style ? (
                          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                            {s.learning_style}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not Set</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontWeight: 600 }}>
                        {s.enrolled_courses}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontWeight: 600 }}>
                        {s.group_count}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            background: `${engagementColor}1A`,
                            color: engagementColor,
                          }}
                        >
                          {engagement}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setStudentToDelete(s);
                            setDeleteError('');
                          }}
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease-in-out',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--danger)';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.color = 'var(--danger)';
                          }}
                          title={`Delete account for ${s.student_name}`}
                        >
                          <span>🗑️</span> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {studentToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--danger)', marginBottom: '0.2rem' }}>
                  Delete Student Account
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  This will permanently revoke student platform access
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.55 }}>
              Are you sure you want to delete the student account for{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{studentToDelete.student_name}</strong>{' '}
              (<code>{studentToDelete.student_email}</code>)?
            </p>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                borderLeft: '3px solid var(--danger)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}
            >
              • The student will be removed from all course enrollments &amp; study groups.<br />
              • Any subsequent login attempt by this student will be blocked with an <strong>Access Revoked</strong> message.
            </div>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStudentToDelete(null);
                  setDeleteError('');
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isDeleting ? <span className="spinner" /> : 'Yes, Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoordinatorStudentsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
          <div className="spinner spinner-lg" />
        </div>
      }
    >
      <CoordinatorStudentsContent />
    </Suspense>
  );
}
