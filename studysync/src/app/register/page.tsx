'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', learning_style: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        learning_style: form.learning_style || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Registration failed. Please try again.');
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', padding: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2>Account Created!</h2>
          <p style={{ marginTop: '0.5rem' }}>Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Create your account</h1>
          <p style={{ marginTop: '0.4rem' }}>Join StudySync as a student</p>
        </div>

        <div className="card card-elevated">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input id="name" type="text" className="input" placeholder="Alice Johnson" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
            </div>
            <div className="form-group">
              <label htmlFor="reg-email">University Email</label>
              <input id="reg-email" type="email" className="input" placeholder="alice@student.edu" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input id="reg-password" type="password" className="input" placeholder="Min. 8 chars, 1 uppercase, 1 number"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Must be at least 8 characters, include 1 uppercase letter (A-Z) and 1 number (0-9).
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="learning_style">Learning Style (optional)</label>
              <select id="learning_style" className="input" value={form.learning_style}
                onChange={(e) => setForm({ ...form, learning_style: e.target.value })}>
                <option value="">Select your learning style...</option>
                <option value="Visual">🖼️ Visual – Learn through diagrams and visuals</option>
                <option value="Auditory">🎧 Auditory – Learn through listening and discussion</option>
                <option value="Reading/Writing">📖 Reading/Writing – Learn through text and notes</option>
                <option value="Kinesthetic">🤸 Kinesthetic – Learn through hands-on practice</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem' }}>
            Already have an account? <Link href="/login" style={{ fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link href="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
