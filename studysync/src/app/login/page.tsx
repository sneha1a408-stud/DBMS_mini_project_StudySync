'use client';
import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '';

  const [role, setRole] = useState<'student' | 'coordinator'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError && urlError !== 'CredentialsSignin') {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn(`${role}-credentials`, {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error && result.error !== 'CredentialsSignin') {
        setError(result.error);
      } else {
        setError('Invalid email or password. Please try again.');
      }
      setLoading(false);
    } else {
      const dest = from || (role === 'coordinator' ? '/coordinator/dashboard' : '/student/dashboard');
      router.push(dest);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="0"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Welcome back</h1>
          <p style={{ marginTop: '0.4rem' }}>Sign in to your StudySync account</p>
        </div>

        <div className="card card-elevated">
          {/* Role Tabs */}
          <div className="tabs" style={{ marginBottom: '1.5rem' }}>
            <button className={`tab-btn ${role === 'student' ? 'active' : ''}`} onClick={() => setRole('student')}>
              🎓 Student
            </button>
            <button className={`tab-btn ${role === 'coordinator' ? 'active' : ''}`} onClick={() => setRole('coordinator')}>
              👩‍🏫 Coordinator
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder={role === 'coordinator' ? 'coordinator@studysync.edu' : 'student@student.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          {role === 'student' && (
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={{ fontWeight: 600 }}>Register here</Link>
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link href="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
