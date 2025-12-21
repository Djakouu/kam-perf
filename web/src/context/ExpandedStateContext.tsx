import { createContext, useContext, useState, ReactNode } from 'react';

interface ExpandedStateContextType {
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  isExpanded: (id: string) => boolean;
}

const ExpandedStateContext = createContext<ExpandedStateContextType | undefined>(undefined);

export function ExpandedStateProvider({ children }: { children: ReactNode }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  return (
    <ExpandedStateContext.Provider value={{ expandedIds, toggleExpanded, isExpanded }}>
      {children}
    </ExpandedStateContext.Provider>
  );
}

export function useExpandedState() {
  const context = useContext(ExpandedStateContext);
  if (context === undefined) {
    throw new Error('useExpandedState must be used within a ExpandedStateProvider');
  }
  return context;
}
