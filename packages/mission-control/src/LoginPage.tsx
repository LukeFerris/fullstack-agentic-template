import { useState } from 'react';
import type { AuthTokens } from './types';
import { login } from './auth';

interface LoginPageProps {
  onLogin: (tokens: AuthTokens) => void;
}

/**
 * Login form component for Cognito authentication.
 * @param props - Component props
 * @param props.onLogin - Callback invoked with tokens on successful auth
 * @returns The rendered login page
 */
function LoginPage({ onLogin }: LoginPageProps): React.ReactNode {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await login(username, password);
      onLogin(tokens);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Mission Control</h1>
        <p className="text-slate-400 text-center mb-6 text-sm">Sign in to manage environments</p>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Username" value={username}
            onChange={(e) => setUsername(e.target.value)} required
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
