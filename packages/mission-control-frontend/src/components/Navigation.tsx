import { logout } from '../auth';

/**
 * Navigation header for Mission Control
 * @returns The rendered Navigation component
 */
function Navigation(): React.ReactNode {
  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight">Mission Control</span>
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-300 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default Navigation;
