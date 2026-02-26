import { useState } from 'react';
import { deleteEnvironment, AuthError, type Environment } from '../api';

interface DeleteDialogProps {
  environment: Environment;
  onClose: () => void;
  onDeleted: () => void;
  onAuthExpired: () => void;
}

/**
 * Confirmation dialog for deleting an environment
 * @param props - Component props
 * @param props.environment - The environment to delete
 * @param props.onClose - Callback to close the dialog
 * @param props.onDeleted - Callback after successful deletion
 * @returns Delete confirmation dialog component
 */
function DeleteDialog({
  environment,
  onClose,
  onDeleted,
  onAuthExpired,
}: DeleteDialogProps): React.ReactNode {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setDeleting(true);
    setError(null);
    deleteEnvironment(environment.environmentId)
      .then(() => {
        onClose();
        onDeleted();
      })
      .catch((err: unknown) => {
        if (err instanceof AuthError) {
          onAuthExpired();
          return;
        }
        setError(err instanceof Error ? err.message : 'Deletion failed');
        setDeleting(false);
      });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Environment</h3>
        <p className="text-slate-600 mb-1">
          Are you sure you want to delete <strong>{environment.environmentId}</strong>?
        </p>
        <p className="text-sm text-red-600 mb-4">
          This will permanently destroy {environment.resources.length} resources.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete Environment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteDialog;
