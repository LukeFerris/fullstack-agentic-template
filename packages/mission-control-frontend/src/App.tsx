import { useState, useEffect, useCallback } from 'react';
import { initAuth, logout } from './auth';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

/**
 * Main Mission Control application component
 * @returns The rendered App component
 */
function App(): React.ReactNode {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleAuthExpired = useCallback(() => {
    logout();
    setAuthenticated(false);
  }, []);

  useEffect(() => {
    const isAuthed = initAuth();
    setAuthenticated(isAuthed);
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {authenticated && <Navigation />}
      {authenticated ? (
        <Dashboard onAuthExpired={handleAuthExpired} />
      ) : (
        <Login onAuth={() => setAuthenticated(true)} />
      )}
    </div>
  );
}

/**
 * Loading screen shown during auth initialization
 * @returns Loading spinner component
 */
function LoadingScreen(): React.ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
      <p className="text-slate-500 text-lg">Loading...</p>
    </div>
  );
}

export default App;
