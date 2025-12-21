import React from 'react';
import { X, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  status: string;
  progress: number;
  result?: {
    desktop: number;
    mobile: number;
  };
  isFinished: boolean;
  hasError: boolean;
  errorMessage?: string;
  timeRemaining?: string;
  pageUrl?: string;
}

export function StatusModal({ 
  isOpen, 
  onClose, 
  onCancel, 
  status, 
  progress, 
  result, 
  isFinished,
  hasError,
  errorMessage,
  timeRemaining,
  pageUrl
}: StatusModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-xl shadow-lg border border-neutral-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-neutral-900">Analysis Status</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        {pageUrl && (
          <div className="mb-4 p-3 bg-neutral-50 rounded-md border border-neutral-100">
            <p className="text-xs text-neutral-500 uppercase font-semibold mb-1">Analyzing Page</p>
            <p className="text-sm text-neutral-700 truncate" title={pageUrl}>{pageUrl}</p>
          </div>
        )}

        <div className="space-y-4">
          {!isFinished && (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-2" />
              <p className="text-center text-neutral-600 font-medium">{status}</p>
              {timeRemaining && (
                <p className="text-center text-xs text-neutral-400 mt-1">Estimated time remaining: {timeRemaining}</p>
              )}
              <div className="w-full bg-neutral-100 rounded-full h-2 mt-3">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {isFinished && !hasError && result && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 mb-2 text-green-700 font-medium">
                <CheckCircle size={18} />
                <span>Analysis Completed</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-white p-3 rounded border border-green-100">
                  <span className="text-xs text-neutral-500 block">Desktop</span>
                  <span className="text-lg font-bold text-neutral-900">{result.desktop}ms</span>
                </div>
                <div className="bg-white p-3 rounded border border-green-100">
                  <span className="text-xs text-neutral-500 block">Mobile</span>
                  <span className="text-lg font-bold text-neutral-900">{result.mobile}ms</span>
                </div>
              </div>
            </div>
          )}

          {hasError && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 mb-2 text-red-700 font-medium">
                <XCircle size={18} />
                <span>Analysis Failed</span>
              </div>
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            {!isFinished && (
              <>
                {showCancelConfirm ? (
                  <div className="flex items-center gap-2 mr-auto">
                    <span className="text-sm text-neutral-600">Are you sure?</span>
                    <button
                      onClick={() => {
                        onCancel();
                        setShowCancelConfirm(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Cancel Analysis
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              {isFinished ? 'Close' : 'Hide'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
