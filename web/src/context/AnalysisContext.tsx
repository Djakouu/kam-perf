import { createContext, useContext, useState, ReactNode } from 'react';

interface AnalysisContextType {
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  activePageId: string | null;
  setActivePageId: (id: string | null) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider = ({ children }: { children: ReactNode }) => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  return (
    <AnalysisContext.Provider value={{ activeJobId, setActiveJobId, activePageId, setActivePageId }}>
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
