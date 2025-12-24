import { useState, useEffect } from 'react';
import { Play, Trash2, LineChart, Edit2, X, AlertCircle } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client';
import { Badge } from '../ui/Badge';
import { GraphPanel } from './GraphPanel';
import { PageModal } from './PageModal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { UPDATE_PAGE, DELETE_PAGE, TRIGGER_ANALYSIS, CANCEL_ANALYSIS } from '../../graphql/mutations';
import { GET_JOB_STATUS } from '../../graphql/queries';
import { cn } from '../../lib/utils';
import { useAnalysis } from '../../context/AnalysisContext';
import { Tooltip } from '../ui/Tooltip';

import { AnalysisResultModal } from './AnalysisResultModal';
import { StatusModal } from './StatusModal';

interface PageRowProps {
  page: {
    id: string;
    url: string;
    sitecode: string;
    lastEvaluationDate: string;
    desktopCpu: number;
    mobileCpu: number;
  };
  tool: 'KAMELEOON' | 'AB_TASTY';
  filters?: any;
}

export function PageRow({ page, tool, filters }: PageRowProps) {
  const [showGraph, setShowGraph] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultModalState, setResultModalState] = useState<{
    isOpen: boolean;
    status: 'completed' | 'failed';
    message?: string;
  }>({ isOpen: false, status: 'completed' });
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
  const { activeJobId, setActiveJobId, activePageId, setActivePageId } = useAnalysis();
  const isAnalyzingThisRow = activePageId === page.id;
  const isAnalyzingOther = !!activeJobId && !isAnalyzingThisRow;

  const [updatePage, { client, loading: updating }] = useMutation(UPDATE_PAGE, {
    refetchQueries: ['GetHierarchy'],
    onCompleted: () => setIsEditModalOpen(false)
  });

  const [deletePage, { loading: deleting }] = useMutation(DELETE_PAGE, {
    refetchQueries: ['GetHierarchy'],
    onCompleted: () => setIsDeleteModalOpen(false)
  });

  const [triggerAnalysis] = useMutation(TRIGGER_ANALYSIS, {
    onCompleted: (data) => {
      setActiveJobId(data.triggerAnalysis.jobId);
      setActivePageId(page.id);
      setError(null);
      setCompletionState({ status: 'idle' });
      setIsStatusModalOpen(true);
    },
    onError: (err) => {
      setError(err.message);
    }
  });

  const [cancelAnalysis] = useMutation(CANCEL_ANALYSIS);

  const { data: jobStatusData, stopPolling } = useQuery(GET_JOB_STATUS, {
    variables: { jobId: activeJobId || '' },
    skip: !isAnalyzingThisRow || !activeJobId,
    pollInterval: 1000,
    fetchPolicy: 'network-only'
  });

  const [desktopRefetched, setDesktopRefetched] = useState(false);

  const [completionState, setCompletionState] = useState<{
    status: 'idle' | 'completed' | 'failed';
    message?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    if (isAnalyzingThisRow && activeJobId && jobStatusData?.getJobStatus) {
      const { status, failedReason, progress } = jobStatusData.getJobStatus;
      
      // Intermediate refetch when Desktop is done (50%)
      if (progress >= 50 && !desktopRefetched && status !== 'completed' && status !== 'failed') {
        client.refetchQueries({ include: ['GetHierarchy'] });
        setDesktopRefetched(true);
      }

      if (status === 'completed' || status === 'failed') {
        stopPolling();
        setActiveJobId(null);
        setActivePageId(null);
        setDesktopRefetched(false); // Reset for next time
        client.refetchQueries({ include: ['GetHierarchy'] });
        
        setCompletionState({
          status: status as 'completed' | 'failed',
          message: failedReason
        });

        if (status === 'failed') {
          console.error('Analysis failed:', failedReason);
          setError(failedReason || 'Analysis failed');
        }
        
        if (!isStatusModalOpen) {
          setIsStatusModalOpen(true);
        }
      }
    }
  }, [jobStatusData, activeJobId, isAnalyzingThisRow, stopPolling, client, setActiveJobId, setActivePageId, desktopRefetched, isStatusModalOpen]);

  const handleUpdatePage = (data: any) => {
    updatePage({
      variables: {
        id: page.id,
        input: data
      }
    });
  };

  const handleDeletePage = () => {
    deletePage({
      variables: {
        id: page.id
      }
    });
    // setIsDeleteModalOpen(false);
  };

  const handleRunAnalysis = () => {
    triggerAnalysis({
      variables: {
        pageId: page.id,
        tool
      }
    });
  };

  const handleCancelAnalysis = () => {
    if (activeJobId) {
      cancelAnalysis({ variables: { jobId: activeJobId } });
      // Optimistically stop
      stopPolling();
      setActiveJobId(null);
      setActivePageId(null);
      setIsStatusModalOpen(false);
      setCompletionState({ status: 'idle' });
    }
  };

  const progress = jobStatusData?.getJobStatus?.progress || 0;
  const statusMessage = jobStatusData?.getJobStatus?.message;
  const isDesktopPhase = progress < 50;
  
  // Calculate run number (1-5)
  // Desktop: 0-49%. Each run is 10%.
  // Mobile: 50-100%. Each run is 10%.
  const runNumber = isDesktopPhase 
    ? Math.min(5, Math.floor(progress / 10) + 1)
    : Math.min(5, Math.floor((progress - 50) / 10) + 1);

  const statusText = statusMessage || (isDesktopPhase 
    ? `Desktop ${runNumber}/5` 
    : `Mobile ${runNumber}/5`);
    
  const totalRuns = 10;
  const completedRuns = isDesktopPhase ? (runNumber - 1) : (5 + runNumber - 1);
  const remainingRuns = totalRuns - completedRuns;
  const timeRemaining = `~${Math.ceil(remainingRuns * 0.8)} min`;

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-12 gap-4 py-3 px-4 border-b border-neutral-100 hover:bg-neutral-50 items-center text-sm group relative overflow-hidden">
        {isAnalyzingThisRow && (
          <div 
            className="absolute bottom-0 left-0 h-0.5 bg-primary-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        )}
        
        <div className="col-span-4 pl-12 flex items-center gap-2 overflow-hidden">
          <Tooltip content={page.url}>
            <span className="truncate text-neutral-600 cursor-default">{page.url}</span>
          </Tooltip>
          {error && (
            <Tooltip content={error}>
              <div className="text-status-danger flex items-center">
                <AlertCircle size={14} />
              </div>
            </Tooltip>
          )}
        </div>
        
        <div className="col-span-2 text-neutral-500 overflow-hidden">
          <Tooltip content={page.sitecode || ''}>
            <span className="truncate block max-w-[150px] cursor-default">{page.sitecode}</span>
          </Tooltip>
        </div>
        
        <div className="col-span-2 text-neutral-500">
          {new Date(page.lastEvaluationDate).toLocaleDateString()}
        </div>
        
        <div className="col-span-1">
          <Badge value={page.desktopCpu} />
        </div>
        
        <div className="col-span-1">
          <Badge value={page.mobileCpu} />
        </div>
        
        <div className={cn(
          "col-span-2 flex justify-end gap-2 transition-opacity items-center",
          isAnalyzingThisRow ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {isAnalyzingThisRow ? (
            <div className="flex items-center gap-2">
              <div 
                className="flex flex-col items-end mr-2 animate-pulse cursor-pointer"
                onClick={() => setIsStatusModalOpen(true)}
              >
                <span className="text-xs font-medium text-primary-800">Show Status</span>
                <span className="text-[10px] text-neutral-400">{timeRemaining}</span>
              </div>
              <Tooltip content="Cancel Analysis">
                <button 
                  onClick={handleCancelAnalysis}
                  className="p-1.5 text-neutral-400 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors"
                >
                  <X size={14} />
                </button>
              </Tooltip>
            </div>
          ) : (
            <Tooltip content={isAnalyzingOther ? "Analysis in progress on another page" : "Run Analysis (Est. ~8 mins)"}>
              <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzingOther}
                className="p-1.5 text-neutral-400 hover:text-primary-800 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
              >
                <Play size={14} />
              </button>
            </Tooltip>
          )}
          
          <Tooltip content="Edit">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              disabled={isAnalyzingThisRow}
              className="p-1.5 text-neutral-400 hover:text-primary-800 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-30"
            >
              <Edit2 size={14} />
            </button>
          </Tooltip>
          <Tooltip content="View Graph">
            <button 
              onClick={() => setShowGraph(!showGraph)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showGraph ? "text-primary-800 bg-primary-50" : "text-neutral-400 hover:text-primary-800 hover:bg-primary-50"
              )}
            >
              <LineChart size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isAnalyzingThisRow}
              className="p-1.5 text-neutral-400 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors disabled:opacity-30" 
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {showGraph && (
        <div className="px-4 pb-4 bg-neutral-50 pl-16">
          <GraphPanel 
            entityId={page.id} 
            entityType="PAGE" 
            tool={tool} 
            filters={filters}
            key={page.lastEvaluationDate} // Force re-render when date changes
          />
        </div>
      )}

      <PageModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdatePage}
        initialData={{
          url: page.url,
          sitecode: page.sitecode
        }}
        isLoading={updating}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeletePage}
        entityName={page.url}
        entityType="Page"
        isLoading={deleting}
      />

      <AnalysisResultModal
        isOpen={resultModalState.isOpen}
        onClose={() => setResultModalState(prev => ({ ...prev, isOpen: false }))}
        status={resultModalState.status}
        message={resultModalState.message}
        desktopScore={page.desktopCpu}
        mobileScore={page.mobileCpu}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onCancel={handleCancelAnalysis}
        status={statusText}
        progress={progress}
        pageUrl={page.url}
        result={{
          desktop: page.desktopCpu,
          mobile: page.mobileCpu
        }}
        isFinished={completionState.status === 'completed'}
        hasError={completionState.status === 'failed'}
        errorMessage={error || completionState.message}
        timeRemaining={timeRemaining}
      />
    </div>
  );
}
