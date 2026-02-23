import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/admin/Dashboard';
import Callback from './pages/admin/Callback';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Main application component with routing
 * @returns The rendered App component
 */
function App(): React.ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/callback" element={<Callback />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
