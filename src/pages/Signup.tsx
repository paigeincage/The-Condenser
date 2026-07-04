import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { register } from '../api/auth';
import { useAuth } from '../stores/auth';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base';

const LABEL_CLASS = 'block text-xs font-bold uppercase tracking-wider text-[var(--text-2)] mb-1.5';

export function Signup() {
  const nav = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || loading) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { token, user } = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        company: company.trim() || undefined,
      });
      setAuth(token, user);
      nav('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--accent-tint)] border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)]">
            <UserPlus size={24} strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-[var(--text)]">
            Create Account
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Punch lists, condensed.</p>
        </div>

        <form onSubmit={handleSubmit} className="app-card space-y-4">
          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              Name *
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Paige Beltran"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className={LABEL_CLASS}>
              Email *
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className={LABEL_CLASS}>
              Password *
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="company" className={LABEL_CLASS}>
              Company
            </label>
            <input
              id="company"
              type="text"
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Optional"
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name || !email || !password}
            className="app-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-3)] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[var(--accent)] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
