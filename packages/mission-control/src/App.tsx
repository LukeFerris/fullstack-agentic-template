import { useState } from 'react';
import type { AuthTokens } from './types';
import { getStoredTokens, logout } from './auth';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';

/**
 * Root application component managing auth state.
 * @returns The rendered App component
 */
function App(): React.ReactNode {
  const [tokens, setTokens] = useState<AuthTokens | null>(getStoredTokens);

  const handleLogout = () => {
    logout();
    setTokens(null);
  };

  if (!tokens) {
    return <LoginPage onLogin={setTokens} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
