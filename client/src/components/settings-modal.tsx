import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"untested" | "connected" | "failed">("untested");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['/api/settings'],
    enabled: open,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { encryptedApiKey: string }) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Your API key has been saved securely.",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/settings/test");
      return response.json();
    },
    onSuccess: (data) => {
      setConnectionStatus(data.connected ? "connected" : "failed");
      toast({
        title: data.connected ? "Connection Successful" : "Connection Failed",
        description: data.connected ? "API key is valid and working." : "Please check your API key.",
        variant: data.connected ? "default" : "destructive",
      });
    },
  });

  useEffect(() => {
    if (settingsQuery.data && (settingsQuery.data as any).connectionStatus) {
      setConnectionStatus((settingsQuery.data as any).connectionStatus as "untested" | "connected" | "failed");
    }
  }, [settingsQuery.data]);

  const handleSave = async () => {
    if (apiKey.trim()) {
      const encryptedKey = await encryptApiKey(apiKey);
      saveSettingsMutation.mutate({ encryptedApiKey: encryptedKey });
    }
  };

  const handleTestConnection = () => {
    if (apiKey.trim()) {
      // Save first, then test
      handleSave();
      setTimeout(() => {
        testConnectionMutation.mutate();
      }, 500);
    } else {
      testConnectionMutation.mutate();
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return <span className="text-xs text-green-600">Connected</span>;
      case "failed":
        return <span className="text-xs text-red-600">Connection Failed</span>;
      default:
        return <span className="text-xs text-gray-500">Not Tested</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-settings">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key" className="text-sm font-medium text-gray-700">
              Mistral API Key
            </Label>
            <div className="relative mt-1">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your Mistral API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
                data-testid="input-api-key"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
                data-testid="button-toggle-api-key-visibility"
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your API key is stored locally and encrypted for security
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              data-testid="button-test-connection"
            >
              {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
              {getConnectionStatusText()}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-settings"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending || !apiKey.trim()}
            data-testid="button-save-settings"
          >
            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
