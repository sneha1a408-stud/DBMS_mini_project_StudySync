'use client';
import { useEffect, useState } from 'react';

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

interface AnalyticsData {
  stats: {
    total_students: number;
    total_courses: number;
    active_groups: number;
    total_sessions: number;
  };
  courseHealth: CourseHealth[];
}

export default function CoordinatorAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch('/api/coordinator/dashboard');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const courseHealth = data?.courseHealth || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Course Health Summary</h1>
        <p>Engagement index combining student enrollments, active study cohorts, completed sessions, and student feedback ratings</p>
      </div>

      <div className="card">
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>
            Course Health Matrix
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time aggregate course performance computed from student enrollments, active groups, sessions, and MongoDB feedback reviews.
          </p>
        </div>

        {courseHealth.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            No course data found for your coordinator account.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Course</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Enrollments</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Active Groups</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Completed Sessions</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Health Score</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>MongoDB Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {courseHealth.map((c) => {
                  const score = Number(c.health_score) || 0;
                  const scoreColor = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

                  return (
                    <tr key={c.course_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{c.course_name}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{c.department}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>{c.total_students}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{c.active_groups}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{c.completed_sessions}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, background: `${scoreColor}1A`, color: scoreColor }}>
                          {score} / 100
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {c.avg_rating !== null ? (
                          <span style={{ fontWeight: 700, color: '#D97706' }}>
                            ★ {c.avg_rating} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({c.total_feedback})</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
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
    </div>
  );
}
