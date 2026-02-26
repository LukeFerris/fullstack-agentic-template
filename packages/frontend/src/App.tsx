import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

/**
 * Main application component with routing
 * @returns The rendered App component
 */
function App(): React.ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
