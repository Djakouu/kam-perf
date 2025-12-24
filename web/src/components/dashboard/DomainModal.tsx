import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/Input';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; sitecode: string; selfHostingUrl?: string; cookieConsentCode?: string; consentStrategy?: string }) => void;
  initialData?: { name: string; sitecode: string; selfHostingUrl?: string; cookieConsentCode?: string; consentStrategy?: string };
  existingDomains?: Array<{ name: string }>;
  isLoading?: boolean;
}

export function DomainModal({ isOpen, onClose, onSave, initialData, existingDomains = [], isLoading }: DomainModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    sitecode: '',
    selfHostingUrl: '',
    cookieConsentCode: '',
    consentStrategy: 'REQUIRED'
  });
  const [error, setError] = useState<string | null>(null);
  const [showSelfHosting, setShowSelfHosting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        sitecode: initialData.sitecode,
        selfHostingUrl: initialData.selfHostingUrl || '',
        cookieConsentCode: initialData.cookieConsentCode || '',
        consentStrategy: initialData.consentStrategy || 'REQUIRED'
      });
      // Auto-expand if self-hosting is populated
      if (initialData.selfHostingUrl) {
        setShowSelfHosting(true);
      }
    } else {
      setFormData({ name: '', sitecode: '', selfHostingUrl: '', cookieConsentCode: '', consentStrategy: 'REQUIRED' });
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
            <label className="block text-sm font-medium text-neutral-700 mb-2">Consent Strategy <span className="text-red-500">*</span></label>
            <div className="flex flex-col gap-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="consentStrategy" 
                  value="REQUIRED" 
                  checked={formData.consentStrategy === 'REQUIRED'}
                  onChange={(e) => setFormData({ ...formData, consentStrategy: e.target.value })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">Consent is required to display variations</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="consentStrategy" 
                  value="NOT_REQUIRED" 
                  checked={formData.consentStrategy === 'NOT_REQUIRED'}
                  onChange={(e) => setFormData({ ...formData, consentStrategy: e.target.value })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">Variations are displayed before consent</span>
              </label>
            </div>
          </div>

          {formData.consentStrategy === 'REQUIRED' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Cookie Consent Button Selector <span className="text-red-500">*</span></label>
              <Input
                required
                value={formData.cookieConsentCode}
                onChange={(e) => setFormData({ ...formData, cookieConsentCode: e.target.value })}
                placeholder="e.g. #didomi-notice-agree-button"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Unique CSS selector for the "Accept Cookies" button. Lighthouse will wait for it, click it, and reload the page.
              </p>
            </div>
          )}

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
              {initialData ? 'Save Changes' : 'Create Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
