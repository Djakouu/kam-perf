import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityName: string;
  entityType: 'Account' | 'Domain' | 'Page';
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityType
}: DeleteConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');
  const isMatch = inputValue === entityName;

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
          <h3 className="text-lg font-semibold text-neutral-900">Delete {entityType}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-neutral-600 mb-4">
          This action cannot be undone. This will permanently delete the {entityType.toLowerCase()} <span className="font-bold text-neutral-900">{entityName}</span> and all associated data.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Type <span className="font-mono font-bold">{entityName}</span> to confirm
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-status-danger focus:border-transparent"
            placeholder={entityName}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatch}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors",
              isMatch
                ? "bg-status-danger hover:bg-status-critical"
                : "bg-neutral-300 cursor-not-allowed"
            )}
          >
            Delete {entityType}
          </button>
        </div>
      </div>
    </div>
  );
}
