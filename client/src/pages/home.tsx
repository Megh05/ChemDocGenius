import { useState, useEffect } from "react";
import { FileText, Settings, Clock, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import StepProgress from "@/components/step-progress";
import UploadStep from "@/components/upload-step";
import ProcessingStep from "@/components/processing-step";
import SectionSelectionStep from "@/components/section-selection-step";
import ReviewStep from "@/components/review-step";
import GenerateStep from "@/components/generate-step";
import SettingsModal from "@/components/settings-modal";
import HistoryModal from "@/components/history-modal";
import { usePipeline } from "@/hooks/use-pipeline";
import { getStoredApiKey, decryptApiKey } from "@/lib/crypto";

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [llmStatus, setLlmStatus] = useState<"checking" | "online" | "offline">("checking");
  const { currentStep, currentDocument, goToStep } = usePipeline();

  // Query to check LLM connection status
  const connectionQuery = useQuery({
    queryKey: ["/api/settings/test"],
    queryFn: async () => {
      const response = await fetch("/api/settings/test", { method: "POST" });
      return response.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  // Update LLM status based on connection query
  useEffect(() => {
    if (connectionQuery.isLoading) {
      setLlmStatus("checking");
    } else if (connectionQuery.data?.connected) {
      setLlmStatus("online");
    } else {
      setLlmStatus("offline");
    }
  }, [connectionQuery.isLoading, connectionQuery.data]);

  // Auto-load API key from localStorage on startup
  useEffect(() => {
    const loadStoredApiKey = async () => {
      const storedKey = getStoredApiKey();
      if (storedKey) {
        try {
          const decryptedKey = await decryptApiKey(storedKey);
          // Save to server if we have a key
          if (decryptedKey) {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ encryptedApiKey: storedKey })
            });
          }
        } catch (error) {
          console.error("Failed to load stored API key:", error);
        }
      }
    };
    loadStoredApiKey();
  }, []);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <UploadStep />;
      case 2:
        return <ProcessingStep document={currentDocument} />;
      case 3:
        return currentDocument ? (
          <SectionSelectionStep 
            document={currentDocument} 
            onSectionsSelected={(selectedSections) => {
              // Store selected sections and proceed to review
              // TODO: Update document with selected sections
              goToStep(4);
            }}
            onBack={() => goToStep(2)}
          />
        ) : <div>Loading...</div>;
      case 4:
        return <ReviewStep document={currentDocument} />;
      case 5:
        return <GenerateStep document={currentDocument} />;
      default:
        return <UploadStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">ChemDoc Processor</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* LLM Status Indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              llmStatus === "online" 
                ? "bg-green-100 text-green-800" 
                : llmStatus === "offline" 
                ? "bg-red-100 text-red-800" 
                : "bg-yellow-100 text-yellow-800"
            }`} data-testid="llm-status-indicator">
              {llmStatus === "online" ? (
                <Wifi className="w-3 h-3" />
              ) : llmStatus === "offline" ? (
                <WifiOff className="w-3 h-3" />
              ) : (
                <div className="w-3 h-3 border border-yellow-600 border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {llmStatus === "online" ? "LLM Online" : llmStatus === "offline" ? "LLM Offline" : "Checking..."}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowHistory(true)}
              data-testid="button-history"
            >
              <Clock className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSettings(true)}
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Step Progress */}
        <StepProgress currentStep={currentStep} />

        {/* Main Workspace */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {renderCurrentStep()}
        </div>
      </div>

      {/* Modals */}
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      <HistoryModal open={showHistory} onOpenChange={setShowHistory} />
    </div>
  );
}
