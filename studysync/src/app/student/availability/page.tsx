'use client';
import { useEffect, useState } from 'react';

interface AvailabilitySlot {
  availability_id: string;
  day: string;
  start_time: string;
  end_time: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentAvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadSlots = async () => {
    try {
      const res = await fetch('/api/students/profile');
      if (res.ok) {
        const data = await res.json();
        setSlots(data.availability || []);
      }
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      setMessage({ text: 'Start time must be strictly before end time.', type: 'error' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/students/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: selectedDay,
          start_time: startTime,
          end_time: endTime,
        }),
      });
      if (res.ok) {
        setMessage({ text: `Added availability slot for ${selectedDay} (${startTime} - ${endTime})!`, type: 'success' });
        await loadSlots();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to add availability', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error adding availability', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id: string, day: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/students/availability?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage({ text: `Removed availability slot for ${day}`, type: 'success' });
        setSlots((prev) => prev.filter((s) => s.availability_id !== id));
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to remove slot', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error deleting slot', type: 'error' });
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      if (timeStr.includes('T')) {
        return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${m} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Weekly Availability Schedule</h1>
        <p>Set your free hours during the week to match with peers who have overlapping study schedules</p>
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

      {/* Database Algorithm Info Callout */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(79, 70, 229, 0.04)', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.5rem' }}>⏰</span>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>
              How StudySync Uses Your Schedule
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Our matching algorithm executes a time-interval overlap calculation:
              <code style={{ background: 'var(--bg-muted)', padding: '0.1rem 0.4rem', borderRadius: 4, marginLeft: 4 }}>
                OVERLAP = max(0, min(slot1.end, slot2.end) - max(slot1.start, slot2.start))
              </code>.
              Adding more recurring weekly slots substantially improves your compatibility score with other students.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Add Slot Form */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Add Free Study Window</h2>
          <form onSubmit={handleAddSlot}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Day of Week
              </label>
              <select
                className="input"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  End Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding Window...' : '+ Add Availability Slot'}
            </button>
          </form>
        </div>

        {/* Weekly Schedule Summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Your Active Free Slots ({slots.length})</h2>
          </div>

          {slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
              <p>No availability added yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Add your study hours on the left to start finding partners with matching schedules.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());
                if (daySlots.length === 0) return null;

                return (
                  <div
                    key={day}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                      {day}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {daySlots.map((slot) => (
                        <div
                          key={slot.availability_id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-card)',
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <span>
                            🕐 {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                          </span>
                          <button
                            onClick={() => handleDeleteSlot(slot.availability_id, slot.day)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
