import { useState, useEffect, useCallback } from 'react';
import type { EnvironmentRecord } from './types';
import { fetchEnvironments, deleteEnvironmentApi } from './api';
import EnvironmentCard from './EnvironmentCard';

interface DashboardProps {
  onLogout: () => void;
}

/**
 * Main dashboard showing deployed environments with management controls.
 * @param props - Component props
 * @param props.onLogout - Callback to log out the user
 * @returns The rendered dashboard
 */
function Dashboard({ onLogout }: DashboardProps): React.ReactNode {
  const [environments, setEnvironments] = useState<EnvironmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnvironments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const envs = await fetchEnvironments();
      setEnvironments(envs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEnvironments(); }, [loadEnvironments]);

  const handleDelete = async (resourcePrefix: string) => {
    await deleteEnvironmentApi(resourcePrefix);
    setEnvironments((prev) => prev.filter((e) => e.resourcePrefix !== resourcePrefix));
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Mission Control</h1>
        <div className="flex gap-3">
          <button onClick={loadEnvironments}
            className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition-colors">
            Refresh
          </button>
          <button onClick={onLogout}
            className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition-colors">
            Sign Out
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-lg text-slate-300 mb-4">
          Deployed Environments ({environments.length})
        </h2>
        {loading && <p className="text-slate-400">Loading environments...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && environments.length === 0 && !error && (
          <p className="text-slate-500">No environments deployed yet.</p>
        )}
        <div className="space-y-3">
          {environments.map((env) => (
            <EnvironmentCard key={env.resourcePrefix} env={env} onDelete={handleDelete} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
