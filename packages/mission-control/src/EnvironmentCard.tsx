import { useState } from 'react';
import type { EnvironmentRecord } from './types';

interface EnvironmentCardProps {
  env: EnvironmentRecord;
  onDelete: (resourcePrefix: string) => Promise<void>;
}

/**
 * Displays a single environment with metadata and a delete button.
 * @param props - Component props
 * @param props.env - Environment record data
 * @param props.onDelete - Callback to delete the environment
 * @returns The rendered environment card
 */
function EnvironmentCard({ env, onDelete }: EnvironmentCardProps): React.ReactNode {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Delete environment ${env.resourcePrefix}?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(env.resourcePrefix);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-semibold">{env.resourcePrefix}</h3>
          <p className="text-slate-400 text-xs">{new Date(env.deployedAt).toLocaleString()}</p>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50">
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      <div className="space-y-1 text-sm">
        <p><span className="text-slate-400">Frontend: </span>
          <a href={env.frontendUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{env.frontendUrl}</a></p>
        <p><span className="text-slate-400">API: </span>
          <a href={env.apiUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{env.apiUrl}</a></p>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}

export default EnvironmentCard;
