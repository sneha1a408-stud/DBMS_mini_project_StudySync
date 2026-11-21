'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface StudentProfile {
  student_id: string;
  name: string;
  email: string;
  learning_style: string | null;
  bio: string | null;
  created_at: string;
  enrollments: {
    course: {
      course_id: string;
      course_name: string;
      department: string;
      coordinator: { name: string };
    };
    skill_level: string;
  }[];
  memberships: {
    group: {
      group_id: string;
      group_name: string;
      course: { course_name: string };
    };
  }[];
  availability: {
    availability_id: string;
    day: string;
    start_time: string;
    end_time: string;
  }[];
}

const LEARNING_STYLES = [
  { value: 'Visual', label: 'Visual', icon: '👁️', desc: 'Learns best with diagrams, charts, mind maps, and slides' },
  { value: 'Auditory', label: 'Auditory', icon: '🎧', desc: 'Learns best by listening, discussions, and group explanations' },
  { value: 'Reading/Writing', label: 'Read/Write', icon: '📖', desc: 'Learns best through textbooks, lecture notes, and written summaries' },
  { value: 'Kinesthetic', label: 'Kinesthetic', icon: '⚡', desc: 'Learns best with hands-on labs, coding exercises, and real practice' },
];

export default function StudentProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/students/profile');
        if (res.ok) {
          const data: StudentProfile = await res.json();
          setProfile(data);
          setLearningStyle(data.learning_style || '');
          setBio(data.bio || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/students/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learning_style: learningStyle || undefined,
          bio: bio || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile((prev) => prev ? { ...prev, ...updated } : null);
        setMessage({ text: 'Profile updated successfully! Partner matches will be updated.', type: 'success' });
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to update profile', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error while saving profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const completionItems = [
    { label: 'Name & Email registered', done: true },
    { label: 'Learning style selected', done: !!profile?.learning_style },
    { label: 'Bio / Study goals added', done: !!profile?.bio },
    { label: 'Enrolled in courses', done: (profile?.enrollments.length ?? 0) > 0 },
    { label: 'Availability schedule set', done: (profile?.availability.length ?? 0) > 0 },
  ];
  const completionPercentage = Math.round(
    (completionItems.filter((i) => i.done).length / completionItems.length) * 100
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Student Profile</h1>
        <p>Manage your academic profile and preferences for StudySync partner matching</p>
      </div>

      {message && (
        <div
          className={`card`}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Edit Form */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Profile Information</h2>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Full Name
              </label>
              <input
                type="text"
                className="input"
                value={profile?.name || session?.user?.name || ''}
                disabled
                style={{ background: 'var(--bg-muted)', cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                className="input"
                value={profile?.email || session?.user?.email || ''}
                disabled
                style={{ background: 'var(--bg-muted)', cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Learning Style (Powers Compatibility Algorithm)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
                {LEARNING_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setLearningStyle(style.value)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius)',
                      border: learningStyle === style.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: learningStyle === style.value ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>{style.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: learningStyle === style.value ? 'var(--primary)' : 'inherit' }}>
                      {style.label}
                    </div>
                  </button>
                ))}
              </div>
              {learningStyle && (
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  💡 {LEARNING_STYLES.find((s) => s.value === learningStyle)?.desc}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Bio & Study Goals
              </label>
              <textarea
                className="input"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your academic goals, preferred project topics, or study habits..."
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Right Column: Status & Enrolled Courses summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile Strength */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Profile Strength</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Matching Readiness</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{completionPercentage}%</span>
            </div>
            <div className="score-bar" style={{ marginBottom: '1rem' }}>
              <div className="score-bar-fill" style={{ width: `${completionPercentage}%` }} />
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {completionItems.map((item) => (
                <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{item.done ? '✅' : '⚪'}</span>
                  <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Shortcuts */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Academic Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enrolled Courses:</span>
                <span style={{ fontWeight: 600 }}>{profile?.enrollments.length ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Active Groups:</span>
                <span style={{ fontWeight: 600 }}>{profile?.memberships.length ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Availability Slots:</span>
                <span style={{ fontWeight: 600 }}>{profile?.availability.length ?? 0}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <Link href="/student/courses" className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                Manage Courses
              </Link>
              <Link href="/student/availability" className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                Set Schedule
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
