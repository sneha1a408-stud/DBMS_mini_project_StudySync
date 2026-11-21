'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push(session.user.role === 'coordinator' ? '/coordinator/dashboard' : '/student/dashboard');
    }
  }, [session, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem', background: 'white',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>StudySync</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', padding: '5rem 2rem 3rem',
        background: 'linear-gradient(180deg, #EEF2FF 0%, #F8F9FF 60%)'
      }}>
        <div className="badge badge-primary" style={{ marginBottom: '1.5rem', fontSize: '0.8rem' }}>
          🎓 University Study Platform
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', maxWidth: 700, lineHeight: 1.15, marginBottom: '1.5rem' }}>
          Find Your Perfect{' '}
          <span className="gradient-text">Study Partners</span>
        </h1>
        <p style={{ fontSize: '1.1rem', maxWidth: 560, color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
          StudySync uses a smart compatibility algorithm to match you with ideal study partners based on
          availability, skill levels, learning styles, and shared courses.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/register" className="btn btn-primary btn-lg">
            Start Matching Free →
          </Link>
          <Link href="#how-it-works" className="btn btn-secondary btn-lg">
            How It Works
          </Link>
        </div>

        {/* Score preview */}
        <div style={{
          marginTop: '3.5rem',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem', maxWidth: 700, width: '100%'
        }}>
          {[
            { label: 'Availability Match', pct: 85, color: '#4F46E5' },
            { label: 'Skill Complement', pct: 90, color: '#7C3AED' },
            { label: 'Learning Style', pct: 80, color: '#A855F7' },
            { label: 'Shared Courses', pct: 75, color: '#EC4899' },
          ].map((f) => (
            <div key={f.label} className="card" style={{ padding: '1rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{f.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: f.color, marginBottom: '0.5rem' }}>{f.pct}%</div>
              <div className="score-bar"><div className="score-bar-fill" style={{ width: `${f.pct}%`, background: `linear-gradient(90deg, ${f.color}, #EC4899)` }} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '5rem 2rem', background: 'white' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>How StudySync Works</h2>
            <p style={{ marginTop: '0.75rem' }}>Four steps to find your ideal study group</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            {[
              { step: '01', title: 'Build Your Profile', desc: 'Set your learning style, skill levels for each course, and weekly availability schedule.', icon: '👤' },
              { step: '02', title: 'Get Matched', desc: 'Our algorithm scores 4 compatibility factors to find your best-fit study partners.', icon: '🧮' },
              { step: '03', title: 'Join Study Groups', desc: 'Discover and join study groups for your enrolled courses, or create your own.', icon: '👥' },
              { step: '04', title: 'Schedule & Reflect', desc: 'Schedule sessions, attend them, and submit feedback to track your progress.', icon: '📅' },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{s.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>STEP {s.step}</div>
                <h3 style={{ marginBottom: '0.75rem' }}>{s.title}</h3>
                <p style={{ fontSize: '0.9rem' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matching Algorithm Details */}
      <section style={{ padding: '5rem 2rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Smart Compatibility Algorithm</h2>
          <p style={{ marginBottom: '3rem', maxWidth: 600, margin: '0 auto 3rem' }}>
            Your compatibility score is calculated using four weighted factors for maximum accuracy.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {[
              { factor: 'Availability Overlap', weight: '35%', desc: 'Matching free time slots for study sessions', color: '#4F46E5' },
              { factor: 'Skill Complementarity', weight: '30%', desc: 'Optimal skill level differences for learning', color: '#7C3AED' },
              { factor: 'Learning Style', weight: '20%', desc: 'VARK-based compatibility matrix', color: '#A855F7' },
              { factor: 'Shared Courses', weight: '15%', desc: 'Common course enrollment overlap', color: '#EC4899' },
            ].map((f) => (
              <div key={f.factor} className="card" style={{ textAlign: 'left' }}>
                <div style={{
                  display: 'inline-flex', padding: '0.4rem 0.8rem', borderRadius: 8,
                  background: `${f.color}18`, color: f.color, fontWeight: 800, fontSize: '1.1rem',
                  marginBottom: '0.75rem'
                }}>{f.weight}</div>
                <h4 style={{ marginBottom: '0.5rem' }}>{f.factor}</h4>
                <p style={{ fontSize: '0.85rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '5rem 2rem', textAlign: 'center',
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)'
      }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Ready to Find Your Study Squad?</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>Join StudySync and start collaborating smarter.</p>
        <Link href="/register" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)' }}>
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '1.5rem 2rem', background: 'var(--text-primary)', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
        StudySync – University DBMS Project · Built with Next.js, PostgreSQL & MongoDB
      </footer>
    </div>
  );
}
