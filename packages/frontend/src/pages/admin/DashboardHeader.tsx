/**
 * Dashboard header component
 * @param props - Component props
 * @param props.onLogout - Logout callback function
 * @returns Rendered header
 */
export default function DashboardHeader({ onLogout }: { onLogout: () => void }): React.ReactNode {
  return (
    <div className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">🚀</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Mission Control</h1>
              <p className="text-sm text-gray-400">Environment Management</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
