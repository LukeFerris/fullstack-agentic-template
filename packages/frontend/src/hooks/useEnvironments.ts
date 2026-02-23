import { useState, useEffect } from 'react';
import { loadConfig } from '../config';
import { useAuth } from './useAuth';

interface Environment {
  environmentId: string;
  projectName: string;
  frontendUrl: string;
  apiUrl: string;
  deployedAt: string;
}

/**
 * Fetches environments from the API
 * @param token - Authentication token
 * @returns List of environments
 */
async function fetchFromAPI(token: string): Promise<Environment[]> {
  const appConfig = await loadConfig();
  if (!appConfig.missionControl) {
    throw new Error('Mission Control not configured');
  }

  const response = await fetch(
    `${appConfig.missionControl.apiUrl}/admin/environments`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  const data = await response.json();
  return data.environments || [];
}

/**
 * Deletes an environment via API
 * @param environmentId - ID to delete
 * @param token - Authentication token
 */
async function deleteFromAPI(environmentId: string, token: string): Promise<void> {
  const appConfig = await loadConfig();
  if (!appConfig.missionControl) {
    throw new Error('Mission Control not configured');
  }

  const response = await fetch(
    `${appConfig.missionControl.apiUrl}/admin/environments/${environmentId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to delete: ${response.statusText}`);
  }
}

/**
 * Hook for managing environments (list, delete)
 * @returns Environments data and methods
 */
export function useEnvironments() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await fetchFromAPI(token);
      setEnvironments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      console.error('Error fetching environments:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEnvironment = async (environmentId: string): Promise<void> => {
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      await deleteFromAPI(environmentId, token);
      setEnvironments((prev) => prev.filter((env) => env.environmentId !== environmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      console.error('Error deleting environment:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, []);

  return { environments, loading, error, refetch: fetchEnvironments, deleteEnvironment };
}
