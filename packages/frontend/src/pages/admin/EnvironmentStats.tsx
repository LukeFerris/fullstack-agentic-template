/**
 * Environment statistics component
 * @param props - Component props
 * @param props.count - Total environment count
 * @param props.loading - Loading state
 * @returns Rendered stats card
 */
export default function EnvironmentStats({ count, loading }: { count: number; loading: boolean }): React.ReactNode {
  return (
    <div className="mb-8">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total Environments</p>
            <p className="text-3xl font-bold text-white mt-1">
              {loading ? '...' : count}
            </p>
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-2xl">📦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
