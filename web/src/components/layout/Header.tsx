

import { useQuery, gql } from '@apollo/client';

const GET_SCHEDULER_METRICS = gql`
  query GetSchedulerMetrics {
    getSchedulerMetrics {
      waiting
      active
      completed
      failed
      delayed
    }
  }
`;

interface HeaderProps {}

export function Header({}: HeaderProps) {
  const { data } = useQuery(GET_SCHEDULER_METRICS, {
    pollInterval: 10000, // Poll every 10s
  });

  const metrics = data?.getSchedulerMetrics;
  const isProd = import.meta.env.PROD; // Vite env var

  // Simple check if we are in the scheduling window (00:00 - 09:00 FR time)
  // Note: This is client-side time, so it depends on the user's timezone if not handled carefully.
  // Ideally, the API should return the scheduler status.
  // For now, we just show the queue status if there are active/waiting jobs.

  const hasActivity = metrics && (metrics.active > 0 || metrics.waiting > 0);

  return (
    <header className="bg-white border-b border-neutral-200 px-8 py-6 flex-shrink-0">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">CPU Monitoring Dashboard</h1>
            <p className="text-neutral-500 mt-1">Monitor performance metrics across all customer accounts</p>
          </div>
          
          {isProd && metrics && (
            <div className="flex items-center gap-4 text-sm">
               <div className={`px-3 py-1 rounded-full border ${hasActivity ? 'bg-green-50 border-green-200 text-green-700' : 'bg-neutral-50 border-neutral-200 text-neutral-500'}`}>
                  <span className="font-medium">Queue:</span> {metrics.waiting} waiting / {metrics.active} active
               </div>
               {hasActivity && (
                 <div className="text-neutral-500">
                    ~{(metrics.waiting * 2)} min remaining
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
