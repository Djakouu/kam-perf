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
}

export function AccountModal({ isOpen, onClose, onSave, initialData, existingAccounts = [] }: AccountModalProps) {
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
            {initialData ? 'Edit Account' : 'Add Account'}
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Account Name <span className="text-red-500">*</span></label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Kaspersky"
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">TAM Name <span className="text-red-500">*</span></label>
            <Input
              required
              value={formData.tamName}
              onChange={(e) => setFormData({ ...formData, tamName: e.target.value })}
              placeholder="e.g. Jérôme"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-neutral-900 bg-primary-600 rounded-md hover:bg-primary-700"
            >
              {initialData ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
