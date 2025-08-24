import { useState, createContext, useContext, ReactNode } from "react";
import { Document } from "@shared/schema";

interface PipelineContextType {
  currentStep: number;
  currentDocument: Document | null;
  setCurrentStep: (step: number) => void;
  setCurrentDocument: (document: Document | null) => void;
  goToStep: (step: number) => void;
  resetPipeline: () => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const resetPipeline = () => {
    setCurrentStep(1);
    setCurrentDocument(null);
  };

  return (
    <PipelineContext.Provider
      value={{
        currentStep,
        currentDocument,
        setCurrentStep,
        setCurrentDocument,
        goToStep,
        resetPipeline,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error("usePipeline must be used within a PipelineProvider");
  }
  return context;
}
