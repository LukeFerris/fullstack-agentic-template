import { useState, useEffect } from 'react';
import { listEnvironments, AuthError, type Environment } from '../api';
import EnvironmentCard from '../components/EnvironmentCard';
import DeleteDialog from '../components/DeleteDialog';

/**
 * Dashboard page showing all deployed environments
 * @param props - Component props
 * @param props.onAuthExpired - Callback when authentication has expired
 * @returns The rendered Dashboard component
 */
function Dashboard({ onAuthExpired }: { onAuthExpired: () => void }): React.ReactNode {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Environment | null>(null);

  const fetchEnvironments = () => {
    setLoading(true);
    setError(null);
    listEnvironments()
      .then(setEnvironments)
      .catch((err: unknown) => {
        if (err instanceof AuthError) {
          onAuthExpired();
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load environments');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEnvironments();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Header onRefresh={fetchEnvironments} count={environments.length} />

      {loading && <p className="text-slate-500 text-center py-8">Loading environments...</p>}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && environments.length === 0 && <EmptyState />}

      <div className="grid gap-4">
        {environments.map((env) => (
          <EnvironmentCard key={env.environmentId} environment={env} onDelete={setDeleting} />
        ))}
      </div>

      {deleting && (
        <DeleteDialog
          environment={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={fetchEnvironments}
          onAuthExpired={onAuthExpired}
        />
      )}
    </div>
  );
}

/**
 * Page header with title and refresh button
 * @param props - Component props
 * @param props.onRefresh - Callback to refresh the environment list
 * @param props.count - Number of environments
 * @returns Header component
 */
function Header({ onRefresh, count }: { onRefresh: () => void; count: number }): React.ReactNode {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Environments</h2>
        <p className="text-slate-500 text-sm">{count} deployed</p>
      </div>
      <button
        onClick={onRefresh}
        className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}

/**
 * Error banner displayed when API calls fail
 * @param props - Component props
 * @param props.message - Error message to display
 * @returns Error banner component
 */
function ErrorBanner({ message }: { message: string }): React.ReactNode {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
      {message}
    </div>
  );
}

/**
 * Empty state when no environments are found
 * @returns Empty state component
 */
function EmptyState(): React.ReactNode {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500 text-lg">No environments found</p>
      <p className="text-slate-400 text-sm mt-1">
        Deploy an environment to see it here
      </p>
    </div>
  );
}

export default Dashboard;
