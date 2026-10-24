import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export default function WindChart({ data }) {
  // Format the ISO date string for the X-axis
  const formatXAxis = (tickItem) => {
    return format(parseISO(tickItem), 'MMM dd, HH:mm');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded shadow text-sm">
          <p className="font-bold mb-2">{format(parseISO(label), 'MMM dd, yyyy - HH:mm')}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)} MW
            </p>
          ))}
          <div className="mt-2 pt-2 border-t text-gray-600">
            Error (Actual - Forecast): {(payload[0].payload.error_mw).toFixed(2)} MW
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[500px] w-full bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Wind Generation: Actual vs Day-Ahead Forecast</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="startTime" 
            tickFormatter={formatXAxis} 
            minTickGap={50}
            stroke="#6b7280"
          />
          <YAxis 
            domain={['auto', 'auto']}
            stroke="#6b7280"
            label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />
          <Line 
            type="monotone" 
            dataKey="actual_mw" 
            name="Actual Generation" 
            stroke="#0ea5e9" 
            strokeWidth={2}
            dot={false} 
          />
          <Line 
            type="monotone" 
            dataKey="forecast_mw" 
            name="Forecasted Generation" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={false} 
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}