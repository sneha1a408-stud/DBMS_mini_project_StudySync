'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Course {
  course_id: string;
  course_name: string;
  department: string;
}

interface StudyGroup {
  group_id: string;
  group_name: string;
  course_id: string;
  created_by: string;
  description: string | null;
  status: string;
  max_members: number;
  member_count: number;
  created_at: string;
  course: Course;
  creator: { name: string };
  _count: { memberships: number; sessions: number };
}

function CoordinatorGroupsContent() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || 'All';

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId);

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch('/api/groups');
        if (res.ok) {
          setGroups(await res.json());
        }
      } catch (err) {
        console.error('Failed to load coordinator groups:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGroups();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const courseList = ['All', ...Array.from(new Set(groups.map((g) => g.course.course_name)))];

  const filteredGroups = groups.filter((g) => {
    if (selectedCourse === 'All') return true;
    return g.course.course_name === selectedCourse || g.course.course_id === selectedCourse;
  });

  const totalMembers = groups.reduce((acc, g) => acc + (g.member_count || g._count?.memberships || 0), 0);
  const totalCapacity = groups.reduce((acc, g) => acc + g.max_members, 0) || 1;
  const overallUtilization = Math.round((totalMembers / totalCapacity) * 100);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Study Groups & Cohort Monitoring</h1>
          <p>Real-time group membership health monitored under database capacity constraints</p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Overall Capacity Utilization: <strong>{overallUtilization}%</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter by Subject:</span>
            <select
              className="input"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              {courseList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredGroups.length}</strong> Groups
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No study groups found for the selected filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredGroups.map((g) => {
            const count = g.member_count ?? g._count?.memberships ?? 0;
            const isFull = count >= g.max_members;
            const pct = Math.min(100, Math.round((count / g.max_members) * 100));

            return (
              <div key={g.group_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary">{g.course.course_name}</span>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: isFull ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: isFull ? 'var(--danger)' : 'var(--success)',
                      }}
                    >
                      {isFull ? 'FULL' : 'ACTIVE'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>{g.group_name}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Created by <strong>{g.creator?.name || 'Student'}</strong>
                  </p>

                  {g.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
                      &ldquo;{g.description}&rdquo;
                    </p>
                  )}

                  {/* Utilization bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Capacity:</span>
                      <span style={{ fontWeight: 600 }}>{count} / {g.max_members} Members ({pct}%)</span>
                    </div>
                    <div className="score-bar">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: isFull ? 'var(--danger)' : 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  📅 <strong>{g._count?.sessions ?? 0}</strong> Study Sessions Held
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CoordinatorGroupsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    }>
      <CoordinatorGroupsContent />
    </Suspense>
  );
}
