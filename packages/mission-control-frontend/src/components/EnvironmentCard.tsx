import type { Environment } from '../api';

interface EnvironmentCardProps {
  environment: Environment;
  onDelete: (env: Environment) => void;
}

/**
 * Card displaying environment details with actions
 * @param props - Component props
 * @param props.environment - The environment to display
 * @param props.onDelete - Callback when delete is clicked
 * @returns Environment card component
 */
function EnvironmentCard({ environment, onDelete }: EnvironmentCardProps): React.ReactNode {
  const resourceCount = environment.resources.length;
  const resourceTypes = [...new Set(environment.resources.map((r) => r.resourceType))];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 truncate">
            {environment.environmentId}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{environment.projectName}</p>
        </div>
        <button
          onClick={() => onDelete(environment)}
          className="ml-4 text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UrlField label="Frontend" url={environment.frontendUrl} />
        <UrlField label="API" url={environment.apiUrl} />
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">{resourceCount} resources:</span>
        {resourceTypes.map((type) => (
          <span key={type} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Displays a labeled URL with a clickable link
 * @param props - Component props
 * @param props.label - Label text
 * @param props.url - The URL to display
 * @returns URL field component
 */
function UrlField({ label, url }: { label: string; url: string }): React.ReactNode {
  if (!url) return null;

  return (
    <div className="text-sm">
      <span className="text-slate-400 text-xs uppercase tracking-wide">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-blue-600 hover:text-blue-800 truncate"
      >
        {url}
      </a>
    </div>
  );
}

export default EnvironmentCard;
