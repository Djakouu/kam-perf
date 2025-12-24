import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/Input';

interface PageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { url: string; sitecode: string }) => void;
  initialData?: { url: string; sitecode: string };
  existingPages?: Array<{ url: string }>;
  isLoading?: boolean;
}

export function PageModal({ isOpen, onClose, onSave, initialData, existingPages = [], isLoading }: PageModalProps) {
  const [formData, setFormData] = useState({
    url: '',
    sitecode: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [showScriptUrl, setShowScriptUrl] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.sitecode) {
        setShowScriptUrl(true);
      }
    } else {
      setFormData({ url: '', sitecode: '' });
      setShowScriptUrl(false);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isDuplicate = existingPages.some(
      p => p.url.toLowerCase() === formData.url.trim().toLowerCase() && 
           p.url.toLowerCase() !== initialData?.url.toLowerCase()
    );

    if (isDuplicate) {
      setError('A page with this URL already exists.');
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-lg shadow-lg border border-neutral-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">
            {initialData ? 'Edit Page' : 'Add Page'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Page URL <span className="text-red-500">*</span></label>
            <Input
              required
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com/page"
            />
          </div>
          
          <div>
            {!showScriptUrl ? (
              <button
                type="button"
                onClick={() => setShowScriptUrl(true)}
                className="text-sm text-primary-800 hover:text-primary-700 font-medium"
              >
                + Add Custom Kameleoon Script URL (Optional)
              </button>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-neutral-700">
                    Kameleoon Script URL <span className="text-xs font-normal text-neutral-500">(only if different from the domain)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowScriptUrl(false);
                      setFormData({ ...formData, sitecode: '' });
                    }}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    Remove
                  </button>
                </div>
                <Input
                  value={formData.sitecode}
                  onChange={(e) => setFormData({ ...formData, sitecode: e.target.value })}
                  placeholder="e.g. //sitecode.kameleoon.io/engine.js"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  This script will be injected if not automatically detected (e.g. due to consent or self-hosting).
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-neutral-900 bg-primary-600 rounded-md hover:bg-primary-700 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-neutral-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {initialData ? 'Save Changes' : 'Add Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
