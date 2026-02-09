import { useState, useEffect } from 'react';
import { fetchHelloMessage, type HelloResponse } from './api';

/**
 * Main application component.
 * @returns The rendered App component
 */
function App(): React.ReactNode {
  const [count, setCount] = useState(0);
  const [apiResponse, setApiResponse] = useState<HelloResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHelloMessage()
      .then(setApiResponse)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
          Fullstack Template
        </h1>
        <p className="text-gray-600 text-center mb-8">
          React + TypeScript + Tailwind CSS + AWS Lambda
        </p>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Backend API
          </h2>
          {loading && <p className="text-gray-500">Loading...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {apiResponse && (
            <div className="space-y-1">
              <p className="text-gray-800 font-medium">{apiResponse.message}</p>
              <p className="text-sm text-gray-500">
                {new Date(apiResponse.timestamp).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Count: {count}
          </button>
          <p className="text-sm text-gray-500">
            Click the button to increment
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
