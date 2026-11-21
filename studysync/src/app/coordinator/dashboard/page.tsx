'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CourseHealth {
  course_id: string;
  course_name: string;
  department: string;
  semester: string;
  total_students: number;
  active_groups: number;
  completed_sessions: number;
  health_score: number;
  avg_rating: number | null;
  total_feedback: number;
}

interface CoordinatorDashboardData {
  stats: {
    total_students: number;
    total_courses: number;
    active_groups: number;
    total_sessions: number;
  };
  courseHealth: CourseHealth[];
  skillDistribution: { skill_level: string; count: number }[];
  learningStyles: { learning_style: string; count: number }[];
}

export default function CoordinatorDashboardPage() {
  const [data, setData] = useState<CoordinatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/coordinator/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load coordinator dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const stats = data?.stats;
  const courseHealth = data?.courseHealth || [];
  const skillDist = data?.skillDistribution || [];
  const learningStyles = data?.learningStyles || [];

  const totalSkillCount = skillDist.reduce((acc, curr) => acc + curr.count, 0) || 1;
  const totalLearningCount = learningStyles.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Coordinator Academic Dashboard</h1>
          <p>Real-time academic performance and collaboration analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/coordinator/courses" className="btn btn-primary btn-sm">
            + New Course
          </Link>
          <Link href="/coordinator/analytics" className="btn btn-secondary btn-sm">
            DBMS Views 📊
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="dashboard-grid stats-grid" style={{ marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Enrolled Students', value: stats?.total_students ?? 0, icon: '🎓', color: '#4F46E5', href: '/coordinator/students' },
          { label: 'Managed Courses', value: stats?.total_courses ?? 0, icon: '📚', color: '#7C3AED', href: '/coordinator/courses' },
          { label: 'Active Study Groups', value: stats?.active_groups ?? 0, icon: '👥', color: '#059669', href: '/coordinator/groups' },
          { label: 'Completed Sessions', value: stats?.total_sessions ?? 0, icon: '📅', color: '#D97706', href: '/coordinator/analytics' },
        ].map((item) => (
          <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.15s', borderLeft: `4px solid ${item.color}` }}>
              <div style={{ fontSize: '1.75rem' }}>{item.icon}</div>
              <div className="stat-value" style={{ color: item.color }}>{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Course Health Overview */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>
              Course Health & Activity Matrix
            </h2>
          </div>
        </div>

        {courseHealth.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <p>No course activity recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem' }}>Course Name</th>
                  <th style={{ padding: '0.75rem' }}>Department</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Students</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Groups</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Sessions</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Health Score</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Student Rating</th>
                </tr>
              </thead>
              <tbody>
                {courseHealth.map((c) => {
                  const score = Number(c.health_score) || 0;
                  const scoreColor = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

                  return (
                    <tr key={c.course_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600 }}>
                        {c.course_name}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.semester}</div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span className="badge badge-primary">{c.department}</span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                        {c.total_students}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        {c.active_groups}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        {c.completed_sessions}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            background: `${scoreColor}1A`,
                            color: scoreColor,
                          }}
                        >
                          {score} / 100
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        {c.avg_rating !== null ? (
                          <span style={{ fontWeight: 700, color: '#D97706' }}>
                            ★ {c.avg_rating} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({c.total_feedback})</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No reviews yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Distributions Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Skill Level Distribution */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Student Skill Distribution</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Declared proficiency levels across enrolled courses
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {skillDist.map((item) => {
              const pct = Math.round((item.count / totalSkillCount) * 100);
              const color =
                item.skill_level === 'Advanced' ? 'var(--success)' :
                item.skill_level === 'Intermediate' ? 'var(--primary)' : 'var(--warning)';

              return (
                <div key={item.skill_level}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{item.skill_level}</span>
                    <span>{item.count} students ({pct}%)</span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Style Distribution */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>VARK Learning Styles Breakdown</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Student sensory preferences used for peer compatibility grouping
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {learningStyles.map((item) => {
              const pct = Math.round((item.count / totalLearningCount) * 100);
              const icon =
                item.learning_style === 'Visual' ? '👁️' :
                item.learning_style === 'Auditory' ? '🎧' :
                item.learning_style === 'Read/Write' ? '📖' : '⚡';

              return (
                <div key={item.learning_style}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{icon} {item.learning_style}</span>
                    <span>{item.count} students ({pct}%)</span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7C3AED, #EC4899)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
