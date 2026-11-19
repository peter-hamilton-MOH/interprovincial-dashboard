import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

export default function PasswordGate({ children }) {
  const [auth, setAuth] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then(setAuth)
      .catch(() => setAuth({ required: false, authenticated: true }));
  }, []);

  if (auth === null) return null;
  if (!auth.required || auth.authenticated) return children;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuth({ required: true, authenticated: true });
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Lock className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Intergovernmental Intelligence Dashboard</h1>
            <p className="text-sm text-slate-500">Enter the password to continue.</p>
          </div>
        </div>
        <label htmlFor="site-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Password
        </label>
        <input
          id="site-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
