import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; country: string; tamName: string }) => void;
  initialData?: { name: string; country: string; tamName: string };
  existingAccounts?: Array<{ name: string }>;
  isLoading?: boolean;
}

export function AccountModal({ isOpen, onClose, onSave, initialData, existingAccounts = [], isLoading }: AccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    tamName: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ name: '', country: '', tamName: '' });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isDuplicate = existingAccounts.some(
      acc => acc.name.toLowerCase() === formData.name.trim().toLowerCase() && 
             acc.name.toLowerCase() !== initialData?.name.toLowerCase()
    );

    if (isDuplicate) {
      setError('An account with this name already exists.');
      return;
    }

    onSave(formData);
    // onClose(); // Don't close immediately, wait for parent to close or success
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
            {initialData ? 'Edit Account' : 'Add Account'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600" disabled={isLoading}>
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Account Name <span className="text-red-500">*</span></label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Kaspersky"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Country <span className="text-red-500">*</span></label>
            <Select
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
              placeholder="Select a country"
              options={[
                { value: "FR", label: "FR" },
                { value: "UK", label: "UK" },
                { value: "US", label: "US" },
                { value: "DE", label: "DE" },
                { value: "RU", label: "RU" },
              ]}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">TAM Name <span className="text-red-500">*</span></label>
            <Input
              required
              value={formData.tamName}
              onChange={(e) => setFormData({ ...formData, tamName: e.target.value })}
              placeholder="e.g. Jérôme"
              disabled={isLoading}
            />
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
              {initialData ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
