import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface AnalysisResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'completed' | 'failed';
  message?: string;
  desktopScore?: number;
  mobileScore?: number;
}

export function AnalysisResultModal({ 
  isOpen, 
  onClose, 
  status, 
  message,
  desktopScore,
  mobileScore 
}: AnalysisResultModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-lg shadow-lg border border-neutral-200 p-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">
            Analysis {status === 'completed' ? 'Complete' : 'Failed'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          {status === 'completed' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-neutral-600">Analysis finished successfully.</p>
                {(desktopScore !== undefined || mobileScore !== undefined) && (
                  <div className="flex gap-8 justify-center mt-4">
                    <div className="text-center">
                      <div className="text-sm text-neutral-500">Desktop</div>
                      <div className="text-2xl font-bold text-neutral-900">{desktopScore}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-neutral-500">Mobile</div>
                      <div className="text-2xl font-bold text-neutral-900">{mobileScore}</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-2">
                <p className="text-neutral-900 font-medium">Analysis failed</p>
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {message || 'An unknown error occurred'}
                </p>
              </div>
            </>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full px-4 py-2 text-sm font-medium bg-primary-600 rounded-md hover:bg-primary-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
