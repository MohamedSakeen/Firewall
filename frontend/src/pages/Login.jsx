import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { fetchCsrfToken } from '../services/api';
import { clearAuthError, loginUser, selectAuthError, selectAuthStatus } from '../store/slices/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const error = useSelector(selectAuthError);
  const status = useSelector(selectAuthStatus);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const from = location.state?.from;
  const target = from?.pathname && from.pathname !== '/login'
    ? `${from.pathname}${from.search || ''}${from.hash || ''}`
    : '/dashboard';

  useEffect(() => {
    if (status === 'authenticated') navigate(target, { replace: true });
  }, [status, target, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      await fetchCsrfToken();
      const result = await dispatch(loginUser({ username: username.trim(), password }));
      if (loginUser.rejected.match(result)) setPassword('');
    } catch {
      setLocalError('Unable to start a secure session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    borderRadius: 'var(--radius)', fontSize: '13px', padding: '8px 10px', outline: 'none', width: '100%',
  };

  const visibleError = localError || error;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <div className="w-full max-w-sm rounded p-6 space-y-5" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-heading)' }}>ValaiAran</span>
        </div>

        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>Sign in</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Use your console account to continue.</p>
        </div>

        {visibleError && (
          <div role="alert" className="rounded px-3 py-2 text-xs" style={{ background: 'var(--danger-muted)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-threat)' }}>
            {visibleError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => { setUsername(e.target.value); setLocalError(null); dispatch(clearAuthError()); }}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError(null); dispatch(clearAuthError()); }}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="w-full py-2 text-xs font-semibold rounded transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Access is authorized by the server for every request.
        </p>
      </div>
    </div>
  );
}
