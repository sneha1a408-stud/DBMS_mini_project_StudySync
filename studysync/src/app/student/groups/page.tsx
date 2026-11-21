'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

interface EnrolledCourse {
  course: {
    course_id: string;
    course_name: string;
  };
}

function GroupsContent() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';
  const initialCreate = searchParams.get('create') === 'true';

  const [activeTab, setActiveTab] = useState<'mine' | 'discover'>('mine');
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [allGroups, setAllGroups] = useState<StudyGroup[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(initialCreate);

  // Form states
  const [groupName, setGroupName] = useState('');
  const [courseId, setCourseId] = useState(initialCourseId);
  const [maxMembers, setMaxMembers] = useState(6);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      const [mineRes, allRes, profileRes] = await Promise.all([
        fetch('/api/groups?mine=true'),
        fetch('/api/groups'),
        fetch('/api/students/profile'),
      ]);

      if (mineRes.ok) setMyGroups(await mineRes.json());
      if (allRes.ok) setAllGroups(await allRes.json());
      if (profileRes.ok) {
        const p = await profileRes.json();
        setEnrolledCourses(p.enrollments || []);
        if (!courseId && p.enrollments?.length > 0) {
          setCourseId(p.enrollments[0].course.course_id);
        }
      }
    } catch (err) {
      console.error('Failed to load groups data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: groupName,
          course_id: courseId,
          max_members: Number(maxMembers),
          description: description || undefined,
        }),
      });

      if (res.ok) {
        setMessage({ text: 'Study group created successfully! You are the group leader.', type: 'success' });
        setShowCreateModal(false);
        setGroupName('');
        setDescription('');
        await loadData();
        setActiveTab('mine');
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to create group', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error creating group', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (groupId: string, name: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
      if (res.ok) {
        setMessage({ text: `Successfully joined "${name}"!`, type: 'success' });
        await loadData();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to join group', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error joining group', type: 'error' });
    }
  };

  const handleLeave = async (groupId: string, name: string) => {
    if (!confirm(`Are you sure you want to leave "${name}"?`)) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
      if (res.ok) {
        setMessage({ text: `Left group "${name}"`, type: 'success' });
        await loadData();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to leave group', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error leaving group', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const myGroupIds = new Set(myGroups.map((g) => g.group_id));
  const displayedGroups = activeTab === 'mine' ? myGroups : allGroups;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Collaborative Study Groups</h1>
          <p>Join or organize peer cohorts protected by PostgreSQL capacity triggers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + Create Study Group
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

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Create New Study Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {enrolledCourses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <p style={{ marginBottom: '1rem' }}>You must be enrolled in at least one course to create a study group.</p>
                <Link href="/student/courses" className="btn btn-primary btn-sm">
                  Enroll in a Course First
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreateGroup}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Group Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Algorithms Exam Prep Cohort"
                    required
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Associated Course
                  </label>
                  <select
                    className="input"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    required
                  >
                    {enrolledCourses.map((e) => (
                      <option key={e.course.course_id} value={e.course.course_id}>
                        {e.course.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Max Member Capacity (Enforced by Database Trigger)
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={2}
                    max={12}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    PostgreSQL trigger fn_check_group_capacity prevents over-enrollment beyond this threshold.
                  </span>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Description & Goals (Optional)
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Weekly goals, target exam date, or project focus..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating Group...' : 'Create Group'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          👥 My Groups ({myGroups.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          🌐 Discover All Groups ({allGroups.length})
        </button>
      </div>

      {/* Groups Grid */}
      {displayedGroups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
            {activeTab === 'mine' ? "You haven't joined any study groups yet." : 'No active study groups available.'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 1.25rem' }}>
            {activeTab === 'mine'
              ? 'Browse the Discover tab to find active groups or create your own.'
              : 'Be the first to create a study group for your enrolled courses!'}
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
            Create a Group Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {displayedGroups.map((g) => {
            const isMember = myGroupIds.has(g.group_id);
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
                    Organized by <strong>{g.creator?.name || 'Student'}</strong>
                  </p>

                  {g.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
                      &ldquo;{g.description}&rdquo;
                    </p>
                  )}

                  {/* Member Capacity Meter */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Capacity:</span>
                      <span style={{ fontWeight: 600 }}>
                        {count} / {g.max_members} Members ({pct}%)
                      </span>
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

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    📅 {g._count?.sessions ?? 0} Study Sessions Scheduled
                  </div>
                </div>

                {/* Actions */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  {isMember ? (
                    <>
                      <Link
                        href={`/student/sessions?groupId=${g.group_id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, textAlign: 'center' }}
                      >
                        Sessions 📅
                      </Link>
                      <button
                        onClick={() => handleLeave(g.group_id, g.group_name)}
                        className="btn btn-sm"
                        style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                      >
                        Leave
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleJoin(g.group_id, g.group_name)}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                      disabled={isFull}
                    >
                      {isFull ? 'Cohort Full' : 'Join Study Group +'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentGroupsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    }>
      <GroupsContent />
    </Suspense>
  );
}
