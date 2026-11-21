'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

interface StudySession {
  session_id: string;
  group_id: string;
  schedule_time: string;
  duration_minutes: number;
  location: string;
  status: string;
  group: {
    group_id: string;
    group_name: string;
    course: {
      course_id: string;
      course_name: string;
    };
  };
}

interface MyGroup {
  group_id: string;
  group_name: string;
  course: {
    course_id: string;
    course_name: string;
  };
}

function SessionsContent() {
  const searchParams = useSearchParams();
  const filterGroupId = searchParams.get('groupId') || '';

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  // Schedule Session Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(filterGroupId);
  const [scheduleTime, setScheduleTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('University Library, 2nd Floor Study Pod');
  const [scheduling, setScheduling] = useState(false);

  // MongoDB Feedback Modal
  const [feedbackSession, setFeedbackSession] = useState<StudySession | null>(null);
  const [rating, setRating] = useState(5);
  const [topicsCovered, setTopicsCovered] = useState('');
  const [understandingLevel, setUnderstandingLevel] = useState<'Low' | 'Medium' | 'High'>('High');
  const [comments, setComments] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      const [sessionsRes, groupsRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/groups?mine=true'),
      ]);
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (groupsRes.ok) {
        const g = await groupsRes.json();
        setMyGroups(g);
        if (!selectedGroupId && g.length > 0) setSelectedGroupId(g[0].group_id);
      }
    } catch (err) {
      console.error('Failed to load sessions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    setMessage(null);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroupId,
          schedule_time: new Date(scheduleTime).toISOString(),
          duration_minutes: Number(duration),
          location,
        }),
      });

      if (res.ok) {
        setMessage({ text: 'Session scheduled successfully!', type: 'success' });
        setShowScheduleModal(false);
        setScheduleTime('');
        await loadData();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to schedule session', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error scheduling session', type: 'error' });
    } finally {
      setScheduling(false);
    }
  };

  const handleComplete = async (sessionId: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/complete`, { method: 'POST' });
      if (res.ok) {
        setMessage({ text: 'Session marked as completed! You can now submit feedback.', type: 'success' });
        await loadData();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to complete session', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error marking session complete', type: 'error' });
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackSession) return;
    setSubmittingFeedback(true);
    setMessage(null);

    const topicsArray = topicsCovered.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: feedbackSession.session_id,
          group_id: feedbackSession.group_id,
          course_id: feedbackSession.group.course.course_id,
          rating: Number(rating),
          topics_covered: topicsArray.length > 0 ? topicsArray : ['General Discussion'],
          understanding_level: understandingLevel,
          comments: comments || undefined,
        }),
      });

      if (res.ok) {
        setMessage({ text: 'Feedback logged to MongoDB! Your coordinator can view analytics.', type: 'success' });
        setFeedbackSession(null);
        setComments('');
        setTopicsCovered('');
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to submit feedback', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error submitting feedback', type: 'error' });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const upcomingSessions = sessions.filter((s) => s.status !== 'completed' && s.status !== 'cancelled');
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const displayedSessions = activeTab === 'upcoming' ? upcomingSessions : completedSessions;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Study Sessions & Collaborative Learning</h1>
          <p>Organize group study dates and log performance reviews to the hybrid DBMS</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="btn btn-primary"
          disabled={myGroups.length === 0}
        >
          + Schedule Study Session
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

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Schedule Study Session</h2>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSchedule}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Select Study Group
                </label>
                <select
                  className="input"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  required
                >
                  {myGroups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name} ({g.course.course_name})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Duration
                </label>
                <select
                  className="input"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>1 Hour (60 Minutes)</option>
                  <option value={90}>1.5 Hours (90 Minutes)</option>
                  <option value={120}>2 Hours (120 Minutes)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Location / Video Link
                </label>
                <input
                  type="text"
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Science Complex Rm 204 or https://meet.google.com/..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={scheduling}>
                  {scheduling ? 'Scheduling...' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MongoDB Feedback Modal */}
      {feedbackSession && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Session Feedback (MongoDB)</h2>
              <button onClick={() => setFeedbackSession(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Review for <strong>{feedbackSession.group.group_name}</strong> ({feedbackSession.group.course.course_name})
            </p>

            <form onSubmit={handleSubmitFeedback}>
              {/* Star Rating */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Session Quality Rating
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.75rem',
                        cursor: 'pointer',
                        color: star <= rating ? '#F59E0B' : '#E2E8F0',
                        transition: 'transform 0.1s',
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ alignSelf: 'center', fontWeight: 700, marginLeft: '0.5rem', fontSize: '0.9rem' }}>
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Topics Covered */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Topics Covered (Comma separated)
                </label>
                <input
                  type="text"
                  className="input"
                  value={topicsCovered}
                  onChange={(e) => setTopicsCovered(e.target.value)}
                  placeholder="e.g. B-Trees, Query Optimization, Normalization"
                  required
                />
              </div>

              {/* Understanding Level */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Your Post-Session Understanding
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUnderstandingLevel(lvl)}
                      className={`btn btn-sm ${understandingLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Comments & Feedback for Group
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="How helpful was the collaboration? Any areas to review next time?"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setFeedbackSession(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingFeedback}>
                  {submittingFeedback ? 'Saving to MongoDB...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          📅 Upcoming Sessions ({upcomingSessions.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          ✓ Completed Sessions ({completedSessions.length})
        </button>
      </div>

      {displayedSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
            {activeTab === 'upcoming' ? 'No Upcoming Sessions Scheduled' : 'No Completed Sessions Yet'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 1.25rem' }}>
            {activeTab === 'upcoming'
              ? 'Schedule a study session with one of your cohorts to get started.'
              : 'Completed sessions will appear here with feedback rating options.'}
          </p>
          {activeTab === 'upcoming' && myGroups.length > 0 && (
            <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary btn-sm">
              Schedule First Session
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {displayedSessions.map((s) => {
            const dateStr = format(new Date(s.schedule_time), 'EEEE, MMMM d, yyyy');
            const timeStr = format(new Date(s.schedule_time), 'h:mm a');

            return (
              <div key={s.session_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary">{s.group.course.course_name}</span>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: s.status === 'completed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(79, 70, 229, 0.12)',
                        color: s.status === 'completed' ? 'var(--success)' : 'var(--primary)',
                      }}
                    >
                      {s.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>{s.group.group_name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    <div>🗓️ <strong>{dateStr}</strong> at {timeStr}</div>
                    <div>⏱️ Duration: {s.duration_minutes} minutes</div>
                    <div>📍 Location: {s.location}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  {s.status !== 'completed' ? (
                    <button
                      onClick={() => handleComplete(s.session_id)}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                    >
                      Mark Completed & Leave Review ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => setFeedbackSession(s)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%' }}
                    >
                      ★ Submit / Update Feedback
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

export default function StudentSessionsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    }>
      <SessionsContent />
    </Suspense>
  );
}
