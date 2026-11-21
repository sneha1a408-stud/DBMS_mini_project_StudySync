'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format } from 'date-fns';

interface DashboardData {
  student: {
    student_id: string; name: string; email: string;
    learning_style: string | null; bio: string | null; created_at: string;
    enrollments: { course: { course_name: string; department: string }; skill_level: string }[];
    memberships: { group: { group_name: string; course: { course_name: string } } }[];
    availability: { day: string }[];
  };
  upcomingSessions: {
    session_id: string; schedule_time: string; location: string;
    duration_minutes: number; group: { group_name: string; course: { course_name: string } };
  }[];
  notifications: { notification_id: string; title: string; message: string; is_read: boolean; created_at: string }[];
  topMatches: { student: { name: string; learning_style: string | null }; overall: number; commonCourses: { course_name: string }[] }[];
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profileRes, sessionsRes, notifRes, matchRes] = await Promise.all([
        fetch('/api/students/profile'),
        fetch('/api/sessions?status=upcoming'),
        fetch('/api/notifications'),
        fetch('/api/matching'),
      ]);
      const student = profileRes.ok ? await profileRes.json() : null;
      const sessions = sessionsRes.ok ? await sessionsRes.json() : [];
      const notifications = notifRes.ok ? await notifRes.json() : [];
      const matchData = matchRes.ok ? await matchRes.json() : { matches: [] };
      setData({
        student,
        upcomingSessions: sessions.slice(0, 3),
        notifications: notifications.slice(0, 5),
        topMatches: matchData.matches?.slice(0, 3) || [],
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  const student = data?.student;
  const profileCompletion = student ? [
    !!student.name, !!student.email, !!student.learning_style, !!student.bio,
    student.enrollments?.length > 0, student.availability?.length > 0
  ].filter(Boolean).length / 6 * 100 : 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>Welcome back, {session?.user?.name?.split(' ')[0]} 👋</h1>
        <p>Here&apos;s your study activity overview</p>
      </div>

      {/* Stats Row */}
      <div className="dashboard-grid stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Enrolled Courses', value: student?.enrollments?.length ?? 0, icon: '📚', color: '#4F46E5', href: '/student/courses' },
          { label: 'Study Groups', value: student?.memberships?.length ?? 0, icon: '👥', color: '#7C3AED', href: '/student/groups' },
          { label: 'Upcoming Sessions', value: data?.upcomingSessions?.length ?? 0, icon: '📅', color: '#059669', href: '/student/sessions' },
          { label: 'Notifications', value: data?.notifications?.filter(n => !n.is_read).length ?? 0, icon: '🔔', color: '#D97706', href: '/student/notifications' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.15s', borderLeft: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: '1.75rem' }}>{stat.icon}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Profile Completion */}
      {profileCompletion < 100 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)', background: 'rgba(79,70,229,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h4>Complete your profile to get better matches</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Profile {Math.round(profileCompletion)}% complete</p>
            </div>
            <Link href="/student/profile" className="btn btn-primary btn-sm">Complete Profile</Link>
          </div>
          <div className="score-bar">
            <div className="score-bar-fill" style={{ width: `${profileCompletion}%` }} />
          </div>
        </div>
      )}

      <div className="dashboard-grid two-col">
        {/* Upcoming Sessions */}
        <div className="card">
          <div className="section-header">
            <h2>Upcoming Sessions</h2>
            <Link href="/student/sessions" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          {data?.upcomingSessions?.length ? data.upcomingSessions.map((s) => (
            <div key={s.session_id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: 10, padding: '0.5rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>{format(new Date(s.schedule_time), 'MMM').toUpperCase()}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{format(new Date(s.schedule_time), 'd')}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.group.group_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.group.course.course_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {format(new Date(s.schedule_time), 'h:mm a')} · {s.location} · {s.duration_minutes}min
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
              <p style={{ fontSize: '0.9rem' }}>No upcoming sessions</p>
              <Link href="/student/groups" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>Find Groups</Link>
            </div>
          )}
        </div>

        {/* Top Matches */}
        <div className="card">
          <div className="section-header">
            <h2>Top Study Partners</h2>
            <Link href="/student/partners" className="btn btn-secondary btn-sm">See all</Link>
          </div>
          {data?.topMatches?.length ? data.topMatches.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
              <div className="avatar avatar-md">{m.student.name.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.student.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {m.student.learning_style || 'No style set'} · {m.commonCourses?.length ?? 0} shared course{m.commonCourses?.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className={`score-ring ${m.overall >= 70 ? 'score-high' : m.overall >= 50 ? 'score-medium' : 'score-low'}`} style={{ width: 52, height: 52, fontSize: '0.9rem' }}>
                {m.overall}%
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
              <p style={{ fontSize: '0.9rem' }}>Enroll in courses to get matches</p>
              <Link href="/student/courses" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>Enroll Now</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      {data?.notifications?.length ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="section-header">
            <h2>Recent Notifications</h2>
            <Link href="/student/notifications" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          {data.notifications.map((n) => (
            <div key={n.notification_id} style={{
              display: 'flex', gap: '0.75rem', padding: '0.75rem 0',
              borderBottom: '1px solid var(--border)', opacity: n.is_read ? 0.65 : 1
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'var(--border)' : 'var(--primary)', marginTop: 6, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: '0.9rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.message}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{format(new Date(n.created_at), 'MMM d, h:mm a')}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
