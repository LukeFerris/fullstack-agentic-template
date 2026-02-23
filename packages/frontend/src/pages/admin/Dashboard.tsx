import { useAuth } from '../../hooks/useAuth';
import { useEnvironments } from '../../hooks/useEnvironments';
import EnvironmentCard from '../../components/EnvironmentCard';
import DashboardHeader from './DashboardHeader';
import EnvironmentStats from './EnvironmentStats';

/**
 * Mission Control admin dashboard
 * @returns Rendered dashboard page
 */
export default function Dashboard(): React.ReactNode {
  const { logout } = useAuth();
  const { environments, loading, error, deleteEnvironment } = useEnvironments();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <DashboardHeader onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EnvironmentStats count={environments.length} loading={loading} />

        {error && (
          <div className="mb-8 bg-red-900 border border-red-700 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading environments...</p>
            </div>
          </div>
        )}

        {!loading && !error && environments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📭</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Environments Deployed</h3>
            <p className="text-gray-400">Create your first environment by making a commit.</p>
          </div>
        )}

        {!loading && environments.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Deployed Environments</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {environments.map((env) => (
                <EnvironmentCard key={env.environmentId} environment={env} onDelete={deleteEnvironment} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
