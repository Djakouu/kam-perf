import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ANALYTICS } from '../graphql/queries';
import { FiltersBar } from './dashboard/FiltersBar';
import { Loading } from './ui/Loading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export function Analytics() {
  const [filters, setFilters] = useState({
    search: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    country: '',
    tamName: '',
    sitecode: '',
    cpuTime: '',
    device: 'desktop'
  });

  const { data, loading, error } = useQuery(GET_ANALYTICS, {
    variables: {
      filters: {
        dateRange: { start: filters.startDate, end: filters.endDate },
        country: filters.country || undefined,
        tamName: filters.tamName || undefined,
        sitecode: filters.sitecode || undefined,
        device: filters.device
      }
    },
    pollInterval: 5000 // Poll every 5 seconds for real-time updates
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <Loading />;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  const { summary, trends } = data.getAnalytics;

  return (
    <div className="flex flex-col h-full">
      <FiltersBar filters={filters} onFilterChange={handleFilterChange} showDeviceFilter={true} />
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        
        {/* Summary Section */}
        <SummarySection summary={summary} />
        
        {/* Trends Section */}
        <TrendsSection trends={trends} />
      </div>
    </div>
  );
}

function SummarySection({ summary }: { summary: any[] }) {
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');

  return (
    <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Summary Snapshot</h2>
        <div className="flex gap-2 bg-neutral-100 p-1 rounded-md">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-sm rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
          >
            Table
          </button>
          <button 
            onClick={() => setViewMode('graph')}
            className={`px-3 py-1 text-sm rounded-md ${viewMode === 'graph' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
          >
            Graph
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-500 uppercase bg-neutral-50">
              <tr>
                <th className="px-4 py-3">TAM / Group</th>
                <th className="px-4 py-3 text-right">Accounts</th>
                <th className="px-4 py-3 text-right">Domains</th>
                <th className="px-4 py-3 text-right">Pages</th>
                <th className="px-4 py-3 text-right">Domains (5+ Pages)</th>
                <th className="px-4 py-3 text-right">&lt; 500ms</th>
                <th className="px-4 py-3 text-right">500-1000ms</th>
                <th className="px-4 py-3 text-right">1000-2000ms</th>
                <th className="px-4 py-3 text-right">&gt; 2000ms</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row: any) => (
                <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-right">{row.totalAccounts}</td>
                  <td className="px-4 py-3 text-right">{row.totalDomains}</td>
                  <td className="px-4 py-3 text-right">{row.totalPages}</td>
                  <td className="px-4 py-3 text-right">{row.domainsWith5PlusPages}</td>
                  <td className="px-4 py-3 text-right text-green-600">{row.domainsByCpu.under500}</td>
                  <td className="px-4 py-3 text-right text-yellow-600">{row.domainsByCpu.between500And1000}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{row.domainsByCpu.between1000And2000}</td>
                  <td className="px-4 py-3 text-right text-red-600">{row.domainsByCpu.over2000}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalAccounts" name="Accounts" fill="#8884d8" />
              <Bar dataKey="totalDomains" name="Domains" fill="#82ca9d" />
              <Bar dataKey="totalPages" name="Pages" fill="#ffc658" />
              <Bar dataKey="domainsWith5PlusPages" name="Domains (5+ Pages)" fill="#ff7300" />
              <Bar dataKey="domainsByCpu.under500" name="< 500ms" stackId="cpu" fill="#16a34a" />
              <Bar dataKey="domainsByCpu.between500And1000" name="500-1000ms" stackId="cpu" fill="#ca8a04" />
              <Bar dataKey="domainsByCpu.between1000And2000" name="1000-2000ms" stackId="cpu" fill="#ea580c" />
              <Bar dataKey="domainsByCpu.over2000" name="> 2000ms" stackId="cpu" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const CustomLegend = ({ payload, onClick }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => {
        const { color, value, payload: lineProps } = entry;
        
        return (
          <div 
            key={index} 
            className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-75"
            onClick={() => onClick && onClick(entry)}
          >
            <svg width="30" height="10" style={{ overflow: 'visible' }}>
               <line 
                 x1="0" y1="5" x2="30" y2="5" 
                 stroke={color} 
                 strokeWidth="2" 
                 strokeDasharray={lineProps.strokeDasharray} 
               />
            </svg>
            <span style={{ color: '#525252' }}>{value}</span>
          </div>
        );
      })}
    </div>
  );
};

function TrendsSection({ trends }: { trends: any[] }) {
  const [selectedTams, setSelectedTams] = useState<string[]>([]);

  // Extract TAMs (excluding ALL)
  const tams = trends.filter(t => t.id !== 'ALL').map(t => ({ id: t.id, label: t.label }));

  const toggleTam = (tamId: string) => {
    setSelectedTams(prev => 
      prev.includes(tamId) 
        ? prev.filter(id => id !== tamId) 
        : [...prev, tamId]
    );
  };

  // We need to merge all series into a single array of objects keyed by date
  const allDates = new Set<string>();
  trends.forEach(series => {
    series.data.forEach((point: any) => {
      allDates.add(new Date(point.date).toLocaleDateString());
    });
  });

  const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const chartData = sortedDates.map(dateStr => {
    const row: any = { date: dateStr };
    trends.forEach(series => {
      const point = series.data.find((p: any) => new Date(p.date).toLocaleDateString() === dateStr);
      if (point) {
        row[`${series.id}_totalAccounts`] = point.totalAccounts;
        row[`${series.id}_totalDomains`] = point.totalDomains;
        row[`${series.id}_totalPages`] = point.totalPages;
        row[`${series.id}_domainsWith5PlusPages`] = point.domainsWith5PlusPages;
        row[`${series.id}_cpuUnder500`] = point.domainsByCpu.under500;
        row[`${series.id}_cpu500to1000`] = point.domainsByCpu.between500And1000;
        row[`${series.id}_cpu1000to2000`] = point.domainsByCpu.between1000And2000;
        row[`${series.id}_cpuOver2000`] = point.domainsByCpu.over2000;
      }
    });
    return row;
  });

  // Determine which series to show
  const activeSeriesIds = selectedTams.length > 0 ? selectedTams : ['ALL'];

  // Define dash patterns for different TAMs to distinguish them
  const dashPatterns = [undefined, "5 5", "3 4 5 2", "10 5 2 5", "1 1"];

  const historyMetrics = [
    { key: 'totalAccounts', label: 'Accounts', color: '#8884d8' },
    { key: 'totalDomains', label: 'Domains', color: '#82ca9d' },
    { key: 'totalPages', label: 'Pages', color: '#ffc658' },
    { key: 'domainsWith5PlusPages', label: 'Domains (5+ Pages)', color: '#ff7300' },
  ];

  const cpuMetrics = [
    { key: 'cpuUnder500', label: '< 500ms', color: '#16a34a' },
    { key: 'cpu500to1000', label: '500-1000ms', color: '#ca8a04' },
    { key: 'cpu1000to2000', label: '1000-2000ms', color: '#ea580c' },
    { key: 'cpuOver2000', label: '> 2000ms', color: '#dc2626' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Trends Analysis</h2>
        <div className="flex gap-2 flex-wrap">
            {tams.map(tam => (
                <button
                    key={tam.id}
                    onClick={() => toggleTam(tam.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedTams.includes(tam.id) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
                >
                    {tam.label}
                </button>
            ))}
        </div>
      </div>

      <div className="h-[400px] mb-8">
        <h3 className="text-md font-medium mb-2">Historical Trends</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend content={CustomLegend} />
            {activeSeriesIds.map((seriesId, idx) => {
                const seriesLabel = trends.find(t => t.id === seriesId)?.label || seriesId;
                const dashPattern = dashPatterns[idx % dashPatterns.length];
                
                return historyMetrics.map(metric => (
                    <Line 
                        key={`${seriesId}_${metric.key}`}
                        type="monotone" 
                        dataKey={`${seriesId}_${metric.key}`} 
                        name={selectedTams.length > 0 ? `${seriesLabel} - ${metric.label}` : metric.label} 
                        stroke={metric.color} 
                        strokeDasharray={dashPattern}
                        strokeWidth={2}
                    />
                ));
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-[400px]">
        <h3 className="text-md font-medium mb-2">CPU Performance Trends</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend content={CustomLegend} />
            {activeSeriesIds.map((seriesId, idx) => {
                const seriesLabel = trends.find(t => t.id === seriesId)?.label || seriesId;
                const dashPattern = dashPatterns[idx % dashPatterns.length];

                return cpuMetrics.map(metric => (
                    <Line 
                        key={`${seriesId}_${metric.key}`}
                        type="monotone" 
                        dataKey={`${seriesId}_${metric.key}`} 
                        name={selectedTams.length > 0 ? `${seriesLabel} - ${metric.label}` : metric.label} 
                        stroke={metric.color} 
                        strokeDasharray={dashPattern}
                        strokeWidth={2}
                    />
                ));
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
