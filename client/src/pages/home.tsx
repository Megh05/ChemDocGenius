import { useState } from "react";
import { FileText, Settings, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepProgress from "@/components/step-progress";
import UploadStep from "@/components/upload-step";
import ProcessingStep from "@/components/processing-step";
import ReviewStep from "@/components/review-step";
import GenerateStep from "@/components/generate-step";
import SettingsModal from "@/components/settings-modal";
import HistoryModal from "@/components/history-modal";
import { usePipeline } from "@/hooks/use-pipeline";

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { currentStep, currentDocument, goToStep } = usePipeline();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <UploadStep />;
      case 2:
        return <ProcessingStep document={currentDocument} />;
      case 3:
        return <ReviewStep document={currentDocument} />;
      case 4:
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
