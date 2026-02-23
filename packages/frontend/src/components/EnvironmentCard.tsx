import { useState } from 'react';

interface Environment {
  environmentId: string;
  projectName: string;
  frontendUrl: string;
  apiUrl: string;
  deployedAt: string;
}

interface EnvironmentCardProps {
  environment: Environment;
  onDelete: (environmentId: string) => Promise<void>;
}

/**
 * Formats a date as a relative time string (e.g., "2 hours ago")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Environment card component displaying environment details
 * @param props - Component props
 * @param props.environment - Environment data to display
 * @param props.onDelete - Callback function when delete is clicked
 * @returns Rendered environment card
 */
export default function EnvironmentCard({ environment, onDelete }: EnvironmentCardProps): React.ReactNode {
  const [deleting, setDeleting] = useState(false);

  /**
   * Handles delete button click with confirmation
   */
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete environment ${environment.environmentId}?\n\nThis will permanently delete all resources.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete(environment.environmentId);
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">
        <h3 className="text-lg font-mono font-bold text-gray-900 mb-2">
          {environment.environmentId}
        </h3>
        <p className="text-sm text-gray-500">
          {formatRelativeTime(environment.deployedAt)}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Frontend</label>
          <a
            href={environment.frontendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-indigo-600 hover:text-indigo-800 truncate"
          >
            {environment.frontendUrl}
          </a>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">API</label>
          <p className="text-sm text-gray-700 truncate">{environment.apiUrl}</p>
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        {deleting ? 'Deleting...' : 'Delete Environment'}
      </button>
    </div>
  );
}
