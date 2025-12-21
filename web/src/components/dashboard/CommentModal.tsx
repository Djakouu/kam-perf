import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  onDelete?: () => void;
  initialText?: string;
  date: Date;
}

export function CommentModal({ isOpen, onClose, onSave, onDelete, initialText = '', date }: CommentModalProps) {
  const [text, setText] = useState(initialText);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setText(initialText);
    setShowDeleteConfirm(false);
  }, [initialText, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(text);
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
            {initialText ? 'Edit Comment' : 'Add Comment'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 text-sm text-neutral-500">
          For {date.toLocaleDateString()}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Comment</label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your comment here..."
              autoFocus
            />
          </div>

          <div className="flex justify-between items-center mt-6">
            <div>
              {initialText && onDelete && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <span className="text-sm text-neutral-600">Are you sure?</span>
                    <button 
                      type="button"
                      onClick={() => { onDelete(); onClose(); }} 
                      className="text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                    >
                      Yes
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)} 
                      className="text-neutral-500 hover:text-neutral-700 text-sm px-2 py-1 rounded hover:bg-neutral-100"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
