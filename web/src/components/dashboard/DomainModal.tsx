import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/Input';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; sitecode: string; selfHostingUrl?: string; cookieConsentCode?: string }) => void;
  initialData?: { name: string; sitecode: string; selfHostingUrl?: string; cookieConsentCode?: string };
  existingDomains?: Array<{ name: string }>;
}

export function DomainModal({ isOpen, onClose, onSave, initialData, existingDomains = [] }: DomainModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    sitecode: '',
    selfHostingUrl: '',
    cookieConsentCode: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [showSelfHosting, setShowSelfHosting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        sitecode: initialData.sitecode,
        selfHostingUrl: initialData.selfHostingUrl || '',
        cookieConsentCode: initialData.cookieConsentCode || ''
      });
      // Auto-expand if self-hosting is populated
      if (initialData.selfHostingUrl) {
        setShowSelfHosting(true);
      }
    } else {
      setFormData({ name: '', sitecode: '', selfHostingUrl: '', cookieConsentCode: '' });
      setShowSelfHosting(false);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isDuplicate = existingDomains.some(
      d => d.name.toLowerCase() === formData.name.trim().toLowerCase() && 
           d.name.toLowerCase() !== initialData?.name.toLowerCase()
    );

    if (isDuplicate) {
      setError('A domain with this name already exists.');
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
        className="w-full max-w-md bg-white rounded-lg shadow-lg border border-neutral-200 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">
            {initialData ? 'Edit Domain' : 'Add Domain'}
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Domain Name <span className="text-red-500">*</span></label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Kaspersky France"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Kameleoon Script URL <span className="text-red-500">*</span></label>
            <Input
              required
              value={formData.sitecode}
              onChange={(e) => setFormData({ ...formData, sitecode: e.target.value })}
              placeholder="e.g. //sitecode.kameleoon.io/engine.js"
            />
            <p className="mt-1 text-xs text-neutral-500">
              This script will be injected if not automatically detected (e.g. due to consent or self-hosting).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Cookie Consent Button Selector <span className="text-red-500">*</span></label>
            <Input
              required
              value={formData.cookieConsentCode}
              onChange={(e) => setFormData({ ...formData, cookieConsentCode: e.target.value })}
              placeholder="e.g. #didomi-notice-agree-button"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Unique CSS selector for the "Accept Cookies" button (common to desktop and mobile). Lighthouse will wait for it and click it.
            </p>
          </div>

          <div className="pt-2 border-t border-neutral-100">
            {!showSelfHosting ? (
              <button
                type="button"
                onClick={() => setShowSelfHosting(true)}
                className="text-sm text-primary-800 hover:text-primary-700 font-medium"
              >
                + Add Self-Hosting URL (Optional)
              </button>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-neutral-700">Self-Hosting URL (Optional)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSelfHosting(false);
                      setFormData({ ...formData, selfHostingUrl: '' });
                    }}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    Remove
                  </button>
                </div>
                <Input
                  value={formData.selfHostingUrl}
                  onChange={(e) => setFormData({ ...formData, selfHostingUrl: e.target.value })}
                  placeholder="e.g. https://cdn.mysite.com/kameleoon.js"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  If provided, Lighthouse will attribute CPU time from this URL to Kameleoon.
                </p>
              </div>
            )}
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
              {initialData ? 'Save Changes' : 'Create Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
