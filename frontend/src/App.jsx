import { useState, useEffect } from 'react';
import { fetchGenerationData } from './api';
import WindChart from './components/WindChart';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchGenerationData();
        setData(result);
      } catch (err) {
        setError('Failed to load generation data. Please ensure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-xl font-semibold text-gray-600">Loading energy market data...</div>;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-red-600 font-medium">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Day-Ahead Procurement Analysis</h1>
          <p className="text-gray-500 mt-2">Evaluating wind generation forecast accuracy for January 2026</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Mean Absolute Error (MAE)</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">{data?.metrics.mae_mw}</span>
              <span className="text-lg text-gray-500 font-medium">MW</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Average deviation per 30-min interval</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Mean Absolute Percentage Error</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">{data?.metrics.mape_percentage}</span>
              <span className="text-lg text-gray-500 font-medium">%</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Average percentage error margin</p>
          </div>
        </div>

        {/* Chart Section */}
        {data?.timeseries && <WindChart data={data.timeseries} />}
        
      </div>
    </div>
  );
}

export default App;